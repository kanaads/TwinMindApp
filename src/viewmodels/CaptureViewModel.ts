/**
 * Capture ViewModel
 * Handles capture screen state and operations
 */

import { BaseViewModel, ViewModelState } from './BaseViewModel';
import { MemoryService, MemoryServiceResult } from '../services';
import { MemoryModel, TranscriptSegment } from '../models';

export type CaptureTabType = 'searches' | 'notes' | 'transcript';

export interface CaptureViewModelState extends ViewModelState {
  selectedTab: CaptureTabType;
  currentMemory: MemoryModel | null;
  isRecording: boolean;
  recordingDuration: number;
  segments: TranscriptSegment[];
}

export class CaptureViewModel extends BaseViewModel {
  private memoryService: MemoryService;
  private recordingInterval: NodeJS.Timeout | null = null;

  constructor(
    private userId: string,
    private memoryId?: string,
    private existingSegments?: TranscriptSegment[]
  ) {
    super({
      isLoading: false,
      error: null,
      isRefreshing: false,
      selectedTab: 'transcript',
      currentMemory: null,
      isRecording: false,
      recordingDuration: 0,
      segments: existingSegments || [],
    });
    this.memoryService = MemoryService.getInstance();
  }

  /**
   * Initialize capture screen
   */
  public async initialize(): Promise<void> {
    await this.loadMemory();
  }

  /**
   * Set selected tab
   */
  public setSelectedTab(tab: CaptureTabType): void {
    this.setState({ selectedTab: tab });
  }

  /**
   * Get selected tab
   */
  public getSelectedTab(): CaptureTabType {
    return this.state.selectedTab;
  }

  /**
   * Load memory
   */
  private async loadMemory(): Promise<void> {
    if (this.memoryId) {
      await this.executeAsync(async () => {
        const result = await this.memoryService.getMemory(this.userId, this.memoryId!);
        if (result.success && result.data) {
          this.setState({
            currentMemory: result.data,
            segments: result.data.segments,
          });
        }
      });
    } else {
      // Create new memory
      await this.executeAsync(async () => {
        const result = await this.memoryService.createMemory(this.userId);
        if (result.success && result.data) {
          this.setState({ currentMemory: result.data });
        }
      });
    }
  }

  /**
   * Start recording
   */
  public async startRecording(): Promise<void> {
    this.setState({
      isRecording: true,
      recordingDuration: 0,
    });

    // Start duration counter
    this.recordingInterval = setInterval(() => {
      this.setState({
        recordingDuration: this.state.recordingDuration + 1,
      });
    }, 1000);
  }

  /**
   * Stop recording
   */
  public async stopRecording(): Promise<void> {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    this.setState({
      isRecording: false,
    });
  }

  /**
   * Add transcript segment
   */
  public async addSegment(segment: Omit<TranscriptSegment, 'id' | 'createdAt'>): Promise<void> {
    if (!this.state.currentMemory) return;

    await this.executeAsync(async () => {
      const result = await this.memoryService.addSegment(
        this.userId,
        this.state.currentMemory.id,
        segment
      );

      if (result.success && result.data) {
        this.setState({
          currentMemory: result.data,
          segments: result.data.segments,
        });
      }
    });
  }

  /**
   * Update segment
   */
  public async updateSegment(
    segmentId: string,
    updates: Partial<TranscriptSegment>
  ): Promise<void> {
    if (!this.state.currentMemory) return;

    await this.executeAsync(async () => {
      const result = await this.memoryService.updateMemory(
        this.userId,
        this.state.currentMemory.id,
        {
          segments: this.state.segments.map((s: any) =>
            s.id === segmentId ? { ...s, ...updates } : s
          ),
        }
      );

      if (result.success && result.data) {
        this.setState({
          currentMemory: result.data,
          segments: result.data.segments,
        });
      }
    });
  }

  /**
   * Delete segment
   */
  public async deleteSegment(segmentId: string): Promise<void> {
    if (!this.state.currentMemory) return;

    await this.executeAsync(async () => {
      const result = await this.memoryService.updateMemory(
        this.userId,
        this.state.currentMemory.id,
        {
          segments: this.state.segments.filter((s: any) => s.id !== segmentId),
        }
      );

      if (result.success && result.data) {
        this.setState({
          currentMemory: result.data,
          segments: result.data.segments,
        });
      }
    });
  }

  /**
   * Complete memory
   */
  public async completeMemory(): Promise<void> {
    if (!this.state.currentMemory) return;

    await this.executeAsync(async () => {
      const result = await this.memoryService.updateMemory(
        this.userId,
        this.state.currentMemory.id,
        { isCompleted: true }
      );

      if (result.success && result.data) {
        this.setState({ currentMemory: result.data });
      }
    });
  }

  /**
   * Get current memory
   */
  public getCurrentMemory(): MemoryModel | null {
    return this.state.currentMemory;
  }

  /**
   * Get segments
   */
  public getSegments(): TranscriptSegment[] {
    return this.state.segments;
  }

  /**
   * Get recording state
   */
  public isRecording(): boolean {
    return this.state.isRecording;
  }

  /**
   * Get recording duration
   */
  public getRecordingDuration(): number {
    return this.state.recordingDuration;
  }

  /**
   * Get formatted duration
   */
  public getFormattedDuration(): string {
    const minutes = Math.floor(this.state.recordingDuration / 60);
    const seconds = this.state.recordingDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get memory title
   */
  public getMemoryTitle(): string {
    if (this.state.currentMemory) {
      return this.state.currentMemory.title;
    }
    return this.memoryId ? 'Continue Transcript' : 'New Transcript';
  }

  /**
   * Get memory date
   */
  public getMemoryDate(): string {
    if (this.state.currentMemory) {
      return this.state.currentMemory.createdAt.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return new Date().toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /**
   * Get capture state
   */
  public getCaptureState(): CaptureViewModelState {
    return {
      isLoading: this.state.isLoading,
      error: this.state.error,
      isRefreshing: this.state.isRefreshing,
      selectedTab: this.state.selectedTab,
      currentMemory: this.state.currentMemory,
      isRecording: this.state.isRecording,
      recordingDuration: this.state.recordingDuration,
      segments: this.state.segments,
    };
  }

  /**
   * Reset capture state
   */
  public reset(): void {
    super.reset();
    this.setState({
      selectedTab: 'transcript',
      currentMemory: null,
      isRecording: false,
      recordingDuration: 0,
      segments: [],
    });

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }
}
