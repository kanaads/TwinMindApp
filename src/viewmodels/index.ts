/**
 * ViewModels Index
 * Centralized export of all ViewModels
 */

// Base ViewModel
export { BaseViewModel } from './BaseViewModel';
export type { ViewModelState } from './BaseViewModel';

// Authentication ViewModel
export { AuthViewModel } from './AuthViewModel';
export type { AuthViewModelState } from './AuthViewModel';

// Home ViewModel
export { HomeViewModel } from './HomeViewModel';
export type { HomeViewModelState, TabType } from './HomeViewModel';

// Capture ViewModel
export { CaptureViewModel } from './CaptureViewModel';
export type { CaptureViewModelState, CaptureTabType } from './CaptureViewModel';
