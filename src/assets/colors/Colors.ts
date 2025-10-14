/**
 * Application Color Palette
 * Centralized color management for consistent theming
 */

export const Colors = {
  // Primary Colors
  primary: '#007aff',
  primaryDark: '#0056b3',
  primaryLight: '#4da6ff',

  // Secondary Colors
  secondary: '#5a7ba6',
  secondaryDark: '#4a6b96',
  secondaryLight: '#7a9bc6',

  // Accent Colors
  accent: '#e6a372',
  accentDark: '#d4945a',
  accentLight: '#f0b88a',

  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Status Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    tertiary: '#f2f3f5',
    dark: '#1f2937',
  },

  // Text Colors
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    link: '#007aff',
  },

  // Border Colors
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },

  // Shadow Colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },

  // Gradient Colors
  gradient: {
    primary: ['#5a7ba6', '#e6a372'],
    secondary: ['#007aff', '#4da6ff'],
    success: ['#10b981', '#34d399'],
    warning: ['#f59e0b', '#fbbf24'],
    error: ['#ef4444', '#f87171'],
  },
} as const;

export type ColorKey = keyof typeof Colors;
export type GrayColorKey = keyof typeof Colors.gray;
export type BackgroundColorKey = keyof typeof Colors.background;
export type TextColorKey = keyof typeof Colors.text;
export type BorderColorKey = keyof typeof Colors.border;
export type ShadowColorKey = keyof typeof Colors.shadow;
export type GradientColorKey = keyof typeof Colors.gradient;
