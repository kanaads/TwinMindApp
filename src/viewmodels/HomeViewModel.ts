/**
 * Home ViewModel
 * Handles home screen state and operations
 */

import { BaseViewModel, ViewModelState } from './BaseViewModel';
import { MemoryService, MemoryServiceResult } from '../services';
import { MemorySummary, MemoryModel } from '../models';

export type TabType = 'memories' | 'calendar' | 'questions';

export interface HomeViewModelState extends ViewModelState {
  selectedTab: TabType;
  memories: MemorySummary[];
  refreshKey: number;
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
}

export class HomeViewModel extends BaseViewModel {
  private memoryService: MemoryService;

  constructor(private userId: string) {
    super({
      isLoading: false,
      error: null,
      isRefreshing: false,
      selectedTab: 'memories',
      memories: [],
      refreshKey: 0,
      progress: {
        current: 159,
        target: 100,
        percentage: 80,
      },
    });
    this.memoryService = MemoryService.getInstance();
  }

  /**
   * Initialize home screen
   */
  public async initialize(): Promise<void> {
    await this.loadMemories();
  }

  /**
   * Set selected tab
   */
  public setSelectedTab(tab: TabType): void {
    this.setState({ selectedTab: tab });
    
    // Refresh memories when switching to memories tab
    if (tab === 'memories') {
      this.refreshMemories();
    }
  }

  /**
   * Get selected tab
   */
  public getSelectedTab(): TabType {
    return this.state.selectedTab;
  }

  /**
   * Load memories
   */
  public async loadMemories(): Promise<void> {
    await this.executeAsync(async () => {
      const result = await this.memoryService.getMemories(this.userId);
      if (result.success && result.data) {
        this.setState({ memories: result.data });
      }
    });
  }

  /**
   * Refresh memories
   */
  public async refreshMemories(): Promise<void> {
    this.setRefreshing(true);
    await this.loadMemories();
    this.incrementRefreshKey();
    this.setRefreshing(false);
  }

  /**
   * Get memories
   */
  public getMemories(): MemorySummary[] {
    return this.state.memories;
  }

  /**
   * Get refresh key (for forcing component remounts)
   */
  public getRefreshKey(): number {
    return this.state.refreshKey;
  }

  /**
   * Increment refresh key
   */
  private incrementRefreshKey(): void {
    this.setState({ refreshKey: this.state.refreshKey + 1 });
  }

  /**
   * Get progress information
   */
  public getProgress() {
    return this.state.progress;
  }

  /**
   * Update progress
   */
  public updateProgress(current: number, target: number): void {
    const percentage = Math.min((current / target) * 100, 100);
    this.setState({
      progress: {
        current,
        target,
        percentage,
      },
    });
  }

  /**
   * Create new memory
   */
  public async createMemory(title?: string): Promise<MemoryModel | null> {
    const result = await this.executeAsync(async () => {
      const result = await this.memoryService.createMemory(this.userId, title);
      if (result.success && result.data) {
        // Refresh memories list
        await this.loadMemories();
        return result.data;
      }
      return null;
    });

    return result;
  }

  /**
   * Delete memory
   */
  public async deleteMemory(memoryId: string): Promise<boolean> {
    const result = await this.executeAsync(async () => {
      const result = await this.memoryService.deleteMemory(this.userId, memoryId);
      if (result.success) {
        // Refresh memories list
        await this.loadMemories();
        return true;
      }
      return false;
    });

    return result || false;
  }

  /**
   * Get memory by ID
   */
  public async getMemory(memoryId: string): Promise<MemoryModel | null> {
    const result = await this.executeAsync(async () => {
      const result = await this.memoryService.getMemory(this.userId, memoryId);
      return result.success ? result.data || null : null;
    });

    return result;
  }

  /**
   * Get home state
   */
  public getHomeState(): HomeViewModelState {
    return {
      isLoading: this.state.isLoading,
      error: this.state.error,
      isRefreshing: this.state.isRefreshing,
      selectedTab: this.state.selectedTab,
      memories: this.state.memories,
      refreshKey: this.state.refreshKey,
      progress: this.state.progress,
    };
  }

  /**
   * Reset home state
   */
  public reset(): void {
    super.reset();
    this.setState({
      selectedTab: 'memories',
      memories: [],
      refreshKey: 0,
      progress: {
        current: 159,
        target: 100,
        percentage: 80,
      },
    });
  }
}
