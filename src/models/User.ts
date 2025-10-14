/**
 * User Model
 * Represents user data structure and validation
 */

export interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
  accessToken: string;
  idToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  email: string;
  photo: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
}

export interface UserSession {
  user: User;
  isAuthenticated: boolean;
  lastActiveAt: Date;
}

export class UserModel {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public photo: string,
    public accessToken: string,
    public idToken: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static fromGoogleSignIn(userInfo: any, tokens: AuthTokens): UserModel {
    return new UserModel(
      userInfo.id || userInfo.email,
      userInfo.name || '',
      userInfo.email || '',
      userInfo.photo || '',
      tokens.accessToken,
      tokens.idToken
    );
  }

  static fromStorage(storedUser: any): UserModel {
    return new UserModel(
      storedUser.id || storedUser.email,
      storedUser.name || '',
      storedUser.email || '',
      storedUser.photo || '',
      storedUser.accessToken || '',
      storedUser.idToken || '',
      new Date(storedUser.createdAt || Date.now()),
      new Date(storedUser.updatedAt || Date.now())
    );
  }

  toStorage(): any {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      photo: this.photo,
      accessToken: this.accessToken,
      idToken: this.idToken,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  getProfile(): UserProfile {
    return {
      name: this.name,
      email: this.email,
      photo: this.photo,
    };
  }

  getTokens(): AuthTokens {
    return {
      accessToken: this.accessToken,
      idToken: this.idToken,
    };
  }

  updateProfile(profile: Partial<UserProfile>): void {
    if (profile.name) this.name = profile.name;
    if (profile.email) this.email = profile.email;
    if (profile.photo) this.photo = profile.photo;
    this.updatedAt = new Date();
  }

  updateTokens(tokens: Partial<AuthTokens>): void {
    if (tokens.accessToken) this.accessToken = tokens.accessToken;
    if (tokens.idToken) this.idToken = tokens.idToken;
    this.updatedAt = new Date();
  }

  isValid(): boolean {
    return !!(this.id && this.email && this.accessToken && this.idToken);
  }
}
