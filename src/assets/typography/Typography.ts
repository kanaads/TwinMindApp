/**
 * Typography System
 * Centralized font and text styling for consistent typography
 */

export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 22,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 36,
  },

  // Font Weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Text Styles
  textStyles: {
    // Headings
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 1.4,
    },

    // Body Text
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 1.6,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 1.5,
    },

    // Labels
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 1.4,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 1.3,
    },

    // Captions
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 1.3,
    },
    captionSmall: {
      fontSize: 10,
      fontWeight: '400' as const,
      lineHeight: 1.2,
    },

    // Buttons
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 1.2,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 1.2,
    },
    buttonLarge: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 1.2,
    },
  },
} as const;

export type FontSizeKey = keyof typeof Typography.fontSize;
export type FontWeightKey = keyof typeof Typography.fontWeight;
export type LineHeightKey = keyof typeof Typography.lineHeight;
export type TextStyleKey = keyof typeof Typography.textStyles;
