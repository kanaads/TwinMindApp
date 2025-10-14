/**
 * Application Strings
 * Centralized string management for internationalization and consistency
 */

export const Strings = {
  // App Information
  app: {
    name: 'TwinMind',
    tagline: 'Building Your Second Brain',
    version: '1.0.0',
  },

  // Navigation
  navigation: {
    home: 'Home',
    capture: 'Capture',
    signIn: 'Sign In',
    back: '< Home',
  },

  // Authentication
  auth: {
    signIn: 'Sign In',
    signOut: 'Log Out',
    continueWithGoogle: 'Continue with Google',
    continueWithPhone: 'Continue with Phone',
    signInError: 'Sign-in was cancelled',
    signInInProgress: 'Sign-in already in progress',
    playServicesError: 'Play Services not available or outdated.',
    signInErrorActivity: 'The Google Sign-In flow could not find a valid Activity. Please restart the app and try again.',
    signOutError: 'Could not sign out. Please try again.',
  },

  // Home Screen
  home: {
    title: 'TwinMind',
    proBadge: 'PRO',
    progressTitle: 'Capture 100 Hours to Unlock Features',
    progressSubtitle: 'Building Your Second Brain',
    progressText: '159 / 100 hours',
    askAllMemories: 'Ask All Memories',
    capture: 'Capture',
  },

  // Tabs
  tabs: {
    memories: 'Memories',
    calendar: 'Calendar',
    questions: 'Questions',
    searches: 'Searches',
    notes: 'Notes',
    transcript: 'Transcript',
  },

  // Capture Screen
  capture: {
    newTranscript: 'New Transcript',
    continueTranscript: 'Continue Transcript',
    chatWithTranscript: 'Chat with Transcript',
  },

  // Progress
  progress: {
    hours: 'hours',
    completed: 'completed',
    remaining: 'remaining',
  },

  // Status Messages
  status: {
    loading: 'Loading...',
    saving: 'Saving...',
    uploading: 'Uploading...',
    offline: 'You are offline',
    online: 'You are online',
    error: 'An error occurred',
    success: 'Success',
  },

  // Error Messages
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network error. Please check your connection.',
    authentication: 'Authentication failed. Please sign in again.',
    permission: 'Permission denied. Please grant the required permissions.',
    storage: 'Storage error. Please try again.',
    api: 'API error. Please try again later.',
  },

  // Success Messages
  success: {
    saved: 'Successfully saved',
    uploaded: 'Successfully uploaded',
    deleted: 'Successfully deleted',
    updated: 'Successfully updated',
  },

  // Placeholders
  placeholders: {
    search: 'Search...',
    enterText: 'Enter text...',
    selectOption: 'Select an option...',
    noResults: 'No results found',
    noData: 'No data available',
  },

  // Actions
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    confirm: 'Confirm',
    retry: 'Retry',
    refresh: 'Refresh',
    close: 'Close',
    done: 'Done',
    next: 'Next',
    previous: 'Previous',
    continue: 'Continue',
    finish: 'Finish',
  },

  // Footer Links
  footer: {
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
  },

  // Date and Time
  dateTime: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
  },

  // File Types
  fileTypes: {
    audio: 'Audio',
    video: 'Video',
    image: 'Image',
    document: 'Document',
    other: 'Other',
  },

  // Units
  units: {
    hours: 'hours',
    minutes: 'minutes',
    seconds: 'seconds',
    bytes: 'bytes',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
  },
} as const;

export type StringKey = keyof typeof Strings;
export type AppStringKey = keyof typeof Strings.app;
export type NavigationStringKey = keyof typeof Strings.navigation;
export type AuthStringKey = keyof typeof Strings.auth;
export type HomeStringKey = keyof typeof Strings.home;
export type TabStringKey = keyof typeof Strings.tabs;
export type CaptureStringKey = keyof typeof Strings.capture;
export type ProgressStringKey = keyof typeof Strings.progress;
export type StatusStringKey = keyof typeof Strings.status;
export type ErrorStringKey = keyof typeof Strings.errors;
export type SuccessStringKey = keyof typeof Strings.success;
export type PlaceholderStringKey = keyof typeof Strings.placeholders;
export type ActionStringKey = keyof typeof Strings.actions;
export type FooterStringKey = keyof typeof Strings.footer;
export type DateTimeStringKey = keyof typeof Strings.dateTime;
export type FileTypeStringKey = keyof typeof Strings.fileTypes;
export type UnitStringKey = keyof typeof Strings.units;
