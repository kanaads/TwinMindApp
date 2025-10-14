/**
 * Spacing System
 * Consistent spacing values for margins, padding, and layout
 */

export const Spacing = {
  // Base spacing unit (4px)
  base: 4,

  // Spacing scale
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 12,   // 12px
  lg: 16,   // 16px
  xl: 20,   // 20px
  '2xl': 24, // 24px
  '3xl': 32, // 32px
  '4xl': 40, // 40px
  '5xl': 48, // 48px
  '6xl': 64, // 64px

  // Component-specific spacing
  component: {
    // Button spacing
    button: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingHorizontalSmall: 12,
      paddingVerticalSmall: 8,
      paddingHorizontalLarge: 20,
      paddingVerticalLarge: 16,
    },

    // Card spacing
    card: {
      padding: 16,
      margin: 16,
      borderRadius: 12,
    },

    // Input spacing
    input: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },

    // Tab spacing
    tab: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },

    // Header spacing
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 12,
    },

    // Footer spacing
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    // List item spacing
    listItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    // Section spacing
    section: {
      marginTop: 24,
      marginBottom: 16,
    },
  },

  // Layout spacing
  layout: {
    // Screen margins
    screen: {
      horizontal: 16,
      vertical: 12,
    },

    // Container spacing
    container: {
      padding: 16,
      margin: 16,
    },

    // Grid spacing
    grid: {
      gap: 16,
      columnGap: 16,
      rowGap: 16,
    },

    // Flex spacing
    flex: {
      gap: 8,
      gapSmall: 4,
      gapLarge: 16,
    },
  },

  // Border radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    full: 9999,
  },

  // Shadow spacing
  shadow: {
    offset: {
      width: 0,
      height: 2,
    },
    radius: 4,
    elevation: 2,
  },
} as const;

export type SpacingKey = keyof typeof Spacing;
export type ComponentSpacingKey = keyof typeof Spacing.component;
export type LayoutSpacingKey = keyof typeof Spacing.layout;
export type BorderRadiusKey = keyof typeof Spacing.borderRadius;
export type ShadowSpacingKey = keyof typeof Spacing.shadow;
