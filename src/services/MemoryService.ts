/**
 * Memory Service
 * Handles memory/transcript operations, storage, and synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MemoryModel, TranscriptSegment, MemorySummary } from '../models';

// Storage keys
const STORAGE_KEYS = {
  MEMORIES: (userId: string) => `MEMORIES_${userId}`,
  PENDING_UPLOADS: (userId: string) => `PENDING_UPLOADS_${userId}`,
  TRANSCRIPTS: (userId: string, memoryId: string) => `TRANSCRIPTS_${userId}_${memoryId}`,
} as const;

// API configuration
const API_BASE = 'API_BASE_URL'; // Replace with actual API base URL

export interface MemoryServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  uploadedSegments: string[];
  failedSegments: string[];
  error?: string;
}

export class MemoryService {
  private static instance: MemoryService;
  private isOnline: boolean = false;

  private constructor() {
    this.initializeNetworkListener();
  }

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected === true;
    });
  }

  /**
   * Create a new memory
   */
  public async createMemory(
    userId: string,
    title?: string
  ): Promise<MemoryServiceResult<MemoryModel>> {
    try {
      const memory = MemoryModel.create(userId, title);
      await this.saveMemoryToStorage(memory);
      return {
        success: true,
        data: memory,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create memory',
      };
    }
  }

  /**
   * Get all memories for a user
   */
  public async getMemories(userId: string): Promise<MemoryServiceResult<MemorySummary[]>> {
    try {
      const memories = await this.loadMemoriesFromStorage(userId);
      const summaries = memories.map(memory => memory.getSummary());
      return {
        success: true,
        data: summaries,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to load memories',
      };
    }
  }

  /**
   * Get a specific memory
   */
  public async getMemory(
    userId: string,
    memoryId: string
  ): Promise<MemoryServiceResult<MemoryModel>> {
    try {
      const memories = await this.loadMemoriesFromStorage(userId);
      const memory = memories.find(m => m.id === memoryId);
      
      if (!memory) {
        return {
          success: false,
          error: 'Memory not found',
        };
      }

      return {
        success: true,
        data: memory,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to load memory',
      };
    }
  }

  /**
   * Add a segment to a memory
   */
  public async addSegment(
    userId: string,
    memoryId: string,
    segment: Omit<TranscriptSegment, 'id' | 'createdAt'>
  ): Promise<MemoryServiceResult<MemoryModel>> {
    try {
      const result = await this.getMemory(userId, memoryId);
      if (!result.success || !result.data) {
        return result;
      }

      const memory = result.data;
      memory.addSegment(segment);
      await this.saveMemoryToStorage(memory);

      // Try to upload if online
      if (this.isOnline) {
        await this.uploadSegments(userId, memoryId, [segment as TranscriptSegment]);
      } else {
        await this.queueForUpload(userId, memoryId, [segment as TranscriptSegment]);
      }

      return {
        success: true,
        data: memory,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to add segment',
      };
    }
  }

  /**
   * Update a memory
   */
  public async updateMemory(
    userId: string,
    memoryId: string,
    updates: Partial<MemoryModel>
  ): Promise<MemoryServiceResult<MemoryModel>> {
    try {
      const result = await this.getMemory(userId, memoryId);
      if (!result.success || !result.data) {
        return result;
      }

      const memory = result.data;
      Object.assign(memory, updates);
      memory.updatedAt = new Date();
      
      await this.saveMemoryToStorage(memory);
      return {
        success: true,
        data: memory,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update memory',
      };
    }
  }

  /**
   * Delete a memory
   */
  public async deleteMemory(
    userId: string,
    memoryId: string
  ): Promise<MemoryServiceResult<boolean>> {
    try {
      const memories = await this.loadMemoriesFromStorage(userId);
      const filteredMemories = memories.filter(m => m.id !== memoryId);
      await this.saveMemoriesToStorage(userId, filteredMemories);
      
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete memory',
      };
    }
  }

  /**
   * Upload segments to server
   */
  public async uploadSegments(
    userId: string,
    memoryId: string,
    segments: TranscriptSegment[]
  ): Promise<UploadResult> {
    if (!this.isOnline) {
      return {
        success: false,
        uploadedSegments: [],
        failedSegments: segments.map(s => s.id),
        error: 'Device is offline',
      };
    }

    try {
      const response = await fetch(`${API_BASE}/transcripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          memoryId,
          segments: segments.map(s => ({
            id: s.id,
            text: s.text,
            timestamp: s.timestamp,
            confidence: s.confidence,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      // Mark segments as uploaded
      const memory = await this.getMemory(userId, memoryId);
      if (memory.success && memory.data) {
        memory.data.markSegmentsAsUploaded(segments.map(s => s.id));
        await this.saveMemoryToStorage(memory.data);
      }

      return {
        success: true,
        uploadedSegments: segments.map(s => s.id),
        failedSegments: [],
      };
    } catch (error) {
      return {
        success: false,
        uploadedSegments: [],
        failedSegments: segments.map(s => s.id),
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Process pending uploads
   */
  public async processPendingUploads(userId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS(userId));
      if (!pendingData) return;

      const pendingUploads = JSON.parse(pendingData);
      
      for (const upload of pendingUploads) {
        const result = await this.uploadSegments(userId, upload.memoryId, upload.segments);
        if (result.success) {
          // Remove from pending uploads
          await this.removeFromPendingUploads(userId, upload.memoryId);
        }
      }
    } catch (error) {
      console.warn('Failed to process pending uploads:', error);
    }
  }

  /**
   * Save memory to storage
   */
  private async saveMemoryToStorage(memory: MemoryModel): Promise<void> {
    const memories = await this.loadMemoriesFromStorage(memory.userId);
    const existingIndex = memories.findIndex(m => m.id === memory.id);
    
    if (existingIndex !== -1) {
      memories[existingIndex] = memory;
    } else {
      memories.push(memory);
    }
    
    await this.saveMemoriesToStorage(memory.userId, memories);
  }

  /**
   * Load memories from storage
   */
  private async loadMemoriesFromStorage(userId: string): Promise<MemoryModel[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MEMORIES(userId));
      if (!stored) return [];
      
      const memoriesData = JSON.parse(stored);
      return memoriesData.map((data: any) => MemoryModel.fromStorage(data));
    } catch (error) {
      console.warn('Failed to load memories from storage:', error);
      return [];
    }
  }

  /**
   * Save memories to storage
   */
  private async saveMemoriesToStorage(userId: string, memories: MemoryModel[]): Promise<void> {
    try {
      const memoriesData = memories.map(memory => memory.toStorage());
      await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES(userId), JSON.stringify(memoriesData));
    } catch (error) {
      console.warn('Failed to save memories to storage:', error);
    }
  }

  /**
   * Queue segments for upload
   */
  private async queueForUpload(
    userId: string,
    memoryId: string,
    segments: TranscriptSegment[]
  ): Promise<void> {
    try {
      const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS(userId));
      const pendingUploads = pendingData ? JSON.parse(pendingData) : [];
      
      pendingUploads.push({
        memoryId,
        segments,
        timestamp: Date.now(),
      });
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPLOADS(userId),
        JSON.stringify(pendingUploads)
      );
    } catch (error) {
      console.warn('Failed to queue segments for upload:', error);
    }
  }

  /**
   * Remove from pending uploads
   */
  private async removeFromPendingUploads(userId: string, memoryId: string): Promise<void> {
    try {
      const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS(userId));
      if (!pendingData) return;
      
      const pendingUploads = JSON.parse(pendingData);
      const filtered = pendingUploads.filter((upload: any) => upload.memoryId !== memoryId);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPLOADS(userId),
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.warn('Failed to remove from pending uploads:', error);
    }
  }
}
