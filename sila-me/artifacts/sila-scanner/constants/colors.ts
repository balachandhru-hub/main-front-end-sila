/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#172B3A',
    tint: '#2186B8',
    background: '#F6F8FA',
    foreground: '#172B3A',
    card: '#FFFFFF',
    cardForeground: '#172B3A',
    primary: '#2186B8',
    primaryForeground: '#ffffff',
    secondary: '#EAF6FB',
    secondaryForeground: '#123047',
    muted: '#EEF2F4',
    mutedForeground: '#667785',
    accent: '#EEF6EA',
    accentForeground: '#315B2D',
    destructive: '#D92D20',
    destructiveForeground: '#ffffff',
    border: '#DDE4E8',
    input: '#DDE4E8',
    navy: '#123047',
    green: '#6A9E57',
    lightBlue: '#EAF6FB',
    lightGreen: '#EEF6EA',
    warning: '#F4A62A',
    success: '#3D7A35',
  },
  radius: 18,
};

export default colors;
