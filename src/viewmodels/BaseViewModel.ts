/**
 * Base ViewModel
 * Abstract base class for all ViewModels with common functionality
 */

import { useState, useEffect, useCallback } from 'react';

export interface ViewModelState {
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  [key: string]: any; // Allow additional properties
}

export abstract class BaseViewModel {
  protected state: ViewModelState;
  protected setState: (state: Partial<ViewModelState>) => void;

  constructor(initialState: ViewModelState = {
    isLoading: false,
    error: null,
    isRefreshing: false,
  }) {
    this.state = initialState;
    this.setState = this.createStateSetter();
  }

  private createStateSetter() {
    return (newState: Partial<ViewModelState>) => {
      this.state = { ...this.state, ...newState };
    };
  }

  /**
   * Set loading state
   */
  protected setLoading(loading: boolean): void {
    this.setState({ isLoading: loading });
  }

  /**
   * Set error state
   */
  protected setError(error: string | null): void {
    this.setState({ error });
  }

  /**
   * Set refreshing state
   */
  protected setRefreshing(refreshing: boolean): void {
    this.setState({ isRefreshing: refreshing });
  }

  /**
   * Clear error
   */
  protected clearError(): void {
    this.setState({ error: null });
  }

  /**
   * Execute async operation with error handling
   */
  protected async executeAsync<T>(
    operation: () => Promise<T>,
    showLoading: boolean = true
  ): Promise<T | null> {
    try {
      if (showLoading) {
        this.setLoading(true);
      }
      this.clearError();

      const result = await operation();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      this.setError(errorMessage);
      return null;
    } finally {
      if (showLoading) {
        this.setLoading(false);
      }
    }
  }

  /**
   * Get current state
   */
  public getState(): ViewModelState {
    return { ...this.state };
  }

  /**
   * Check if there's an error
   */
  public hasError(): boolean {
    return this.state.error !== null;
  }

  /**
   * Check if loading
   */
  public isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * Check if refreshing
   */
  public isRefreshing(): boolean {
    return this.state.isRefreshing;
  }

  /**
   * Get error message
   */
  public getError(): string | null {
    return this.state.error;
  }

  /**
   * Reset state
   */
  public reset(): void {
    this.state = {
      isLoading: false,
      error: null,
      isRefreshing: false,
    };
  }
}
