/**
 * Authentication Service
 * Handles user authentication, token management, and session persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { UserModel, User, AuthTokens } from '../models';

// Storage keys
const STORAGE_KEYS = {
  ID_TOKEN: '@MyApp:idToken',
  ACCESS_TOKEN: '@MyApp:accessToken',
  USER: '@MyApp:user',
} as const;

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface SignInError {
  code: string;
  message: string;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: UserModel | null = null;

  private constructor() {
    this.initializeGoogleSignIn();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initializeGoogleSignIn(): void {
    GoogleSignin.configure({
      webClientId: '433658787003-k4r6bpbcmeqlkegdks0sobk1aln7sej2.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
  }

  /**
   * Sign in with Google
   */
  public async signInWithGoogle(): Promise<AuthResult> {
    try {
      // Check if Google Play Services is available
      const hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      if (!hasPlayServices) {
        return {
          success: false,
          error: 'Google Play Services not available.',
        };
      }

      // Start Google Sign-In flow
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      if (!tokens.idToken || !tokens.accessToken) {
        return {
          success: false,
          error: 'Missing authentication tokens.',
        };
      }

      // Create user model
      const user = UserModel.fromGoogleSignIn(userInfo.data?.user, {
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });

      // Store user data
      await this.storeUser(user);

      this.currentUser = user;

      return {
        success: true,
        user: user,
      };
    } catch (error: any) {
      return this.handleSignInError(error);
    }
  }

  /**
   * Sign out user
   */
  public async signOut(): Promise<AuthResult> {
    try {
      await GoogleSignin.signOut();
      await this.clearStoredUser();
      this.currentUser = null;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Could not sign out. Please try again.',
      };
    }
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser || null;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentUser?.isValid() || false;
  }

  /**
   * Load user from storage
   */
  public async loadUserFromStorage(): Promise<User | null> {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const storedAccessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedIdToken = await AsyncStorage.getItem(STORAGE_KEYS.ID_TOKEN);

      if (storedUser && storedAccessToken && storedIdToken) {
        const user = UserModel.fromStorage(JSON.parse(storedUser));
        user.updateTokens({
          accessToken: storedAccessToken,
          idToken: storedIdToken,
        });

        if (user.isValid()) {
          this.currentUser = user;
          return user;
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to load user from storage:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  private async storeUser(user: UserModel): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user.toStorage()));
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, user.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.ID_TOKEN, user.idToken);
    } catch (error) {
      console.warn('Failed to store user data:', error);
      throw error;
    }
  }

  /**
   * Clear stored user data
   */
  private async clearStoredUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
    } catch (error) {
      console.warn('Failed to clear stored user data:', error);
    }
  }

  /**
   * Handle sign-in errors
   */
  private handleSignInError(error: any): AuthResult {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return {
        success: false,
        error: 'Sign-in was cancelled',
      };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return {
        success: false,
        error: 'Sign-in already in progress',
      };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        error: 'Play Services not available or outdated.',
      };
    } else if (error.message?.includes('activity is null')) {
      return {
        success: false,
        error: 'The Google Sign-In flow could not find a valid Activity. Please restart the app and try again.',
      };
    } else {
      return {
        success: false,
        error: error.message || 'Unknown sign-in error',
      };
    }
  }

  /**
   * Refresh user tokens
   */
  public async refreshTokens(): Promise<boolean> {
    try {
      const tokens = await GoogleSignin.getTokens();
      if (this.currentUser && tokens.accessToken && tokens.idToken) {
        this.currentUser.updateTokens({
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
        });
        await this.storeUser(this.currentUser);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to refresh tokens:', error);
      return false;
    }
  }
}
