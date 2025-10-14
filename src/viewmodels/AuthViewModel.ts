/**
 * Authentication ViewModel
 * Handles authentication state and operations
 */

import { BaseViewModel, ViewModelState } from './BaseViewModel';
import { AuthService, AuthResult } from '../services';
import { User } from '../models';

export interface AuthViewModelState extends ViewModelState {
  user: User | null;
  isAuthenticated: boolean;
}

export class AuthViewModel extends BaseViewModel {
  private authService: AuthService;

  constructor() {
    super({
      isLoading: false,
      error: null,
      isRefreshing: false,
      user: null,
      isAuthenticated: false,
    });
    this.authService = AuthService.getInstance();
  }

  /**
   * Initialize authentication
   */
  public async initialize(): Promise<void> {
    await this.executeAsync(async () => {
      const user = await this.authService.loadUserFromStorage();
      this.setState({ user, isAuthenticated: !!user });
    });
  }

  /**
   * Sign in with Google
   */
  public async signInWithGoogle(): Promise<AuthResult> {
    const result = await this.executeAsync(async () => {
      return await this.authService.signInWithGoogle();
    });

    if (result && result.success && result.user) {
      this.setState({
        user: result.user,
        isAuthenticated: true,
      });
    }

    return result || { success: false, error: 'Sign in failed' };
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<AuthResult> {
    const result = await this.executeAsync(async () => {
      return await this.authService.signOut();
    });

    if (result && result.success) {
      this.setState({
        user: null,
        isAuthenticated: false,
      });
    }

    return result || { success: false, error: 'Sign out failed' };
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.state.user;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Refresh user tokens
   */
  public async refreshTokens(): Promise<boolean> {
    return await this.executeAsync(async () => {
      return await this.authService.refreshTokens();
    }) || false;
  }

  /**
   * Get user profile
   */
  public getUserProfile() {
    const user = this.getCurrentUser();
    return user ? {
      name: user.name,
      email: user.email,
      photo: user.photo,
    } : null;
  }

  /**
   * Get authentication state
   */
  public getAuthState(): AuthViewModelState {
    return {
      isLoading: this.state.isLoading,
      error: this.state.error,
      isRefreshing: this.state.isRefreshing,
      user: this.state.user,
      isAuthenticated: this.state.isAuthenticated,
    };
  }

  /**
   * Set user (for testing or manual updates)
   */
  public setUser(user: User | null): void {
    this.setState({
      user,
      isAuthenticated: !!user,
    });
  }

  /**
   * Clear authentication state
   */
  public clearAuth(): void {
    this.setState({
      user: null,
      isAuthenticated: false,
    });
    this.clearError();
  }
}
