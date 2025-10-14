/**
 * Services Index
 * Centralized export of all services
 */

// Authentication Service
export { AuthService } from './AuthService';
export type { AuthResult, SignInError } from './AuthService';

// Memory Service
export { MemoryService } from './MemoryService';
export type { MemoryServiceResult, UploadResult } from './MemoryService';

// AI Service
export { AIService } from './AIService';
export type { MeetingSummary, AIServiceResult } from './AIService';

// Recording Service
export { default as RecordingService } from './RecordingService';
export type { RecordingState } from './RecordingService';
