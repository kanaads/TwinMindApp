/**
 * Global Recording Service
 * Manages recording state across the entire app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import AudioRecord from 'react-native-audio-record';
import RNFetchBlob from 'rn-fetch-blob';

// Configuration constants (same as original)
const CHUNK_MS = __DEV__ ? 10000 : 15000;      // 10s dev / 15s prod
const MIN_CHUNK_SIZE_BYTES = 1000;             // higher threshold for better quality
const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30000;
const OPENAI_API_KEY = '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';

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  userId: string;
  memoryId: string;
  startTime: number;
  duration: number;
}

// Types for the recording logic
type Segment = { text: string; ts: number };
type QueueItem = { id: string; filePath: string; ts: number; attempts: number; lastError?: string };
type STTResult = { ok: true; text: string } | { ok: false; err: string };

class RecordingService {
  private static instance: RecordingService;
  private recordingState: RecordingState = {
    isRecording: false,
    isProcessing: false,
    userId: '',
    memoryId: '',
    startTime: 0,
    duration: 0,
  };

  private durationInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'RECORDING_STATE';
  private listeners: { [key: string]: Function[] } = {};
  
  // Recording logic properties
  private recordingCount = 0;
  private activeTimeout: NodeJS.Timeout | null = null;
  private isRecordingRef = false;
  private backoffMs = INITIAL_BACKOFF_MS;
  private syncTimer: NodeJS.Timeout | null = null;
  
  // Storage keys
  private TRANSCRIPTS_KEY = (userId: string, memoryId: string) => `TRANSCRIPTS_${userId}_${memoryId}`;
  private QUEUE_KEY = (userId: string, memoryId: string) => `QUEUE_${userId}_${memoryId}`;

  private constructor() {
    this.loadStateFromStorage();
  }

  /**
   * Add event listener
   */
  public on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  /**
   * Remove event listener
   */
  public off(event: string, listener: Function): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  public static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService();
    }
    return RecordingService.instance;
  }

  /**
   * Load recording state from AsyncStorage
   */
  private async loadStateFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        this.recordingState = { ...this.recordingState, ...parsedState };
        this.emit('stateChanged', this.recordingState);
      }
    } catch (error) {
      console.error('Error loading recording state:', error);
    }
  }

  /**
   * Save recording state to AsyncStorage
   */
  private async saveStateToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recordingState));
    } catch (error) {
      console.error('Error saving recording state:', error);
    }
  }

  /**
   * Start recording
   */
  public async startRecording(userId: string, memoryId: string): Promise<void> {
    console.log(`RecordingService: Starting recording for user ${userId}, memory ${memoryId}`);
    
    this.recordingState = {
      isRecording: true,
      isProcessing: false,
      userId,
      memoryId,
      startTime: Date.now(),
      duration: 0,
    };

    this.isRecordingRef = true;
    console.log(`RecordingService: Set isRecordingRef to true`);
    
    this.recordingCount = 0;
    this.startDurationTimer();
    await this.saveStateToStorage();
    this.emit('recordingStarted', this.recordingState);
    this.emit('stateChanged', this.recordingState);
    
    console.log(`RecordingService: Recording state updated`, this.recordingState);
    
    // Start the recording loop
    console.log(`RecordingService: Starting recording loop`);
    this.startRecordingLoop();
  }

  /**
   * Stop recording
   */
  public async stopRecording(): Promise<void> {
    console.log(`RecordingService: Stopping recording`);
    
    this.isRecordingRef = false;
    console.log(`RecordingService: Set isRecordingRef to false`);
    
    this.recordingState = {
      ...this.recordingState,
      isRecording: false,
      isProcessing: true,
    };

    this.stopDurationTimer();
    this.clearRecordingTimeouts();
    await this.saveStateToStorage();
    this.emit('recordingStopped', this.recordingState);
    this.emit('stateChanged', this.recordingState);
    
    console.log(`RecordingService: Recording stopped`, this.recordingState);
  }

  /**
   * Set processing state
   */
  public async setProcessing(isProcessing: boolean): Promise<void> {
    this.recordingState = {
      ...this.recordingState,
      isProcessing,
    };

    await this.saveStateToStorage();
    this.emit('stateChanged', this.recordingState);
  }

  /**
   * Clear recording state
   */
  public async clearRecording(): Promise<void> {
    this.recordingState = {
      isRecording: false,
      isProcessing: false,
      userId: '',
      memoryId: '',
      startTime: 0,
      duration: 0,
    };

    this.stopDurationTimer();
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    this.emit('recordingCleared');
    this.emit('stateChanged', this.recordingState);
  }

  /**
   * Get current recording state
   */
  public getRecordingState(): RecordingState {
    return { ...this.recordingState };
  }

  /**
   * Check if currently recording
   */
  public isRecording(): boolean {
    return this.recordingState.isRecording;
  }

  /**
   * Start duration timer
   */
  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationInterval = setInterval(() => {
      if (this.recordingState.isRecording) {
        this.recordingState.duration = Math.floor((Date.now() - this.recordingState.startTime) / 1000);
        this.emit('durationUpdated', this.recordingState.duration);
      }
    }, 1000);
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Format duration as MM:SS
   */
  public formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Start the recording loop
   */
  private startRecordingLoop(): void {
    this.recordingLoop();
  }

  /**
   * Recording loop that continues until stopped (exact copy from original TranscriptTab)
   */
  private async recordingLoop(): Promise<void> {
    console.log(`RecordingService: Starting recording loop - chunk ${this.recordingCount + 1}, isRecordingRef: ${this.isRecordingRef}`);
    
    if (!this.isRecordingRef) {
      console.log('RecordingService: Recording stopped, exiting loop');
      return;
    }

    this.recordingCount += 1;
    const filename = `chunk_${this.recordingCount}_${Date.now()}.wav`;
    console.log(`RecordingService: Recording chunk ${this.recordingCount} as ${filename}`);

    AudioRecord.init({ 
      sampleRate: 16000, 
      channels: 1, 
      bitsPerSample: 16, 
      wavFile: filename
    });

    try { 
      await AudioRecord.start();
      console.log(`Recording started: ${filename}`);
    } catch (e) {
      console.error(`Recording start failed: ${(e as Error).message}`);
      this.isRecordingRef = false;
      this.recordingState.isRecording = false;
      this.emit('stateChanged', this.recordingState);
      return;
    }

    // Set timeout for recording chunk
    console.log(`RecordingService: Setting timeout for ${CHUNK_MS}ms`);
    this.activeTimeout = setTimeout(async () => {
      console.log(`RecordingService: Timeout reached, processing chunk ${this.recordingCount}`);
      try {
        const filePath = await AudioRecord.stop();
        if (!filePath) return;
        await new Promise(res => setTimeout(res, 500)); // flush to disk

        const stat = await RNFetchBlob.fs.stat(filePath);
        const fileSize = Number(stat?.size) || 0;
        console.log(`chunk size=${fileSize} bytes`);

        if (!stat || fileSize < MIN_CHUNK_SIZE_BYTES) {
          console.log(`skipped tiny/silent chunk (${fileSize} < ${MIN_CHUNK_SIZE_BYTES})`);
          RNFetchBlob.fs.unlink(filePath).catch(() => {});
        } else {
          console.log(`Processing audio chunk: ${fileSize} bytes`);
          // Process the chunk with Whisper API
          await this.processChunk(filePath);
        }

        // Continue recording loop
        if (this.isRecordingRef) {
          console.log('RecordingService: Continuing recording loop...');
          setTimeout(() => this.recordingLoop(), 100); // Small delay before next chunk
        } else {
          console.log('RecordingService: Recording stopped, not continuing loop');
        }
      } catch (e) {
        console.error(`Error processing chunk: ${(e as Error).message}`);
        if (this.isRecordingRef) {
          setTimeout(() => this.recordingLoop(), 1000); // Retry after delay
        }
      }
    }, CHUNK_MS);
  }

  /**
   * Process audio chunk with Whisper API (from original implementation)
   */
  private async processChunk(filePath: string): Promise<void> {
    try {
      console.log('RecordingService: Starting chunk processing');
      this.recordingState.isProcessing = true;
      await this.saveStateToStorage();
      this.emit('stateChanged', this.recordingState);
      console.log('RecordingService: Processing state set to true');

      const stt = await this.sendToWhisper(filePath, 'en');
      
      console.log('RecordingService: Whisper processing complete');
      this.recordingState.isProcessing = false;
      await this.saveStateToStorage();
      this.emit('stateChanged', this.recordingState);
      console.log('RecordingService: Processing state set to false');

      if (stt.ok && stt.text && stt.text.trim().length > 0) {
        // Filter out trivial/likely-noise one-word outputs when audio is effectively silent
        const cleaned = stt.text.trim();
        const isTrivial = cleaned.length <= 3 || /^(you|the|uh|um|hmm|ah|eh|ok|yeah|yes|no)$/i.test(cleaned);
        if (isTrivial) {
          console.log(`RecordingService: Skipping trivial/likely-noise transcript: "${cleaned}"`);
          RNFetchBlob.fs.unlink(filePath).catch(() => {});
          return;
        }
        const segment: Segment = { text: cleaned, ts: Date.now() };
        console.log(`RecordingService: Adding segment: "${stt.text}"`);
        await this.addSegment(segment);
        console.log(`Whisper OK: ${stt.text.slice(0, 60)}`);
        RNFetchBlob.fs.unlink(filePath).catch(() => {});
      } else {
        console.log('Whisper OK but empty → queue for retry');
        await this.enqueue(filePath);
        this.scheduleSync(this.backoffMs);
      }
    } catch (e) {
      console.error(`Error processing chunk: ${(e as Error).message}`);
      this.recordingState.isProcessing = false;
      this.emit('stateChanged', this.recordingState);
    }
  }

  /**
   * Send audio to Whisper API (from original implementation)
   */
  private async sendToWhisper(filePath: string, language = 'en'): Promise<STTResult> {
    try {
      console.log(`RecordingService: Sending to Whisper API: ${filePath}`);
      const res = await RNFetchBlob.fetch(
        'POST',
        'https://api.openai.com/v1/audio/transcriptions',
        {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        [
          { name: 'file', filename: 'chunk.wav', type: 'audio/wav', data: RNFetchBlob.wrap(filePath) },
          { name: 'model', data: 'whisper-1' },
          { name: 'language', data: language },
          { name: 'response_format', data: 'json' },
          { name: 'temperature', data: '0.0' },
        ]
      );
      const status = res.info().status;
      let json: any = null;
      try { 
        json = res.json();
      } catch { 
        console.log(`RecordingService: Whisper API invalid JSON response`);
        return { ok: false, err: `HTTP ${status}: invalid JSON` };
      }
      if (status !== 200) {
        console.log(`RecordingService: Whisper API error: HTTP ${status}: ${json?.error?.message || 'unknown error'}`);
        return { ok: false, err: `HTTP ${status}: ${json?.error?.message || 'unknown error'}` };
      }
      console.log(`RecordingService: Whisper API success: "${json.text || ''}"`);
      return { ok: true, text: json.text || '' };
    } catch (e) {
      console.log(`RecordingService: Whisper API exception: ${(e as Error).message}`);
      return { ok: false, err: (e as Error).message };
    }
  }

  /**
   * Add segment to transcript (from original implementation)
   */
  private async addSegment(segment: Segment): Promise<void> {
    try {
      const key = this.TRANSCRIPTS_KEY(this.recordingState.userId, this.recordingState.memoryId);
      const existing = await AsyncStorage.getItem(key);
      const segments = existing ? JSON.parse(existing) : [];
      const updated = [...segments, segment];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      
      const transcriptText = updated.map(s => s.text).join('\n');
      console.log(`RecordingService: Emitting transcriptUpdated with text: "${transcriptText}"`);
      
      // Emit transcript update
      this.emit('transcriptUpdated', { 
        userId: this.recordingState.userId,
        memoryId: this.recordingState.memoryId,
        segments: updated, 
        text: transcriptText 
      });
    } catch (error) {
      console.error('Error adding segment:', error);
    }
  }

  /**
   * Enqueue failed chunk for retry (from original implementation)
   */
  private async enqueue(filePath: string): Promise<void> {
    try {
      const key = this.QUEUE_KEY(this.recordingState.userId, this.recordingState.memoryId);
      const existing = await AsyncStorage.getItem(key);
      const queue = existing ? JSON.parse(existing) : [];
      const item: QueueItem = {
        id: Date.now().toString(),
        filePath,
        ts: Date.now(),
        attempts: 0
      };
      queue.push(item);
      await AsyncStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      console.error('Error enqueuing chunk:', error);
    }
  }

  /**
   * Schedule sync for queued items (from original implementation)
   */
  private scheduleSync(delay: number): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimer = setTimeout(() => {
      this.syncQueue();
    }, delay);
  }

  /**
   * Sync queued items (from original implementation)
   */
  private async syncQueue(): Promise<void> {
    // Implementation for syncing queued items
    // This would process failed chunks from the queue
    console.log('Syncing queue...');
  }

  /**
   * Clear all recording timeouts
   */
  private clearRecordingTimeouts(): void {
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

export default RecordingService;
