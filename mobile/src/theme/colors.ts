export const Colors = {
  navy900: '#0B1430',
  navy800: '#131B2E',
  navy700: '#1A2238',
  slate600: '#8B97B0',
  slate500: '#A7B1C4',
  slate300: '#CBD5E1',
  white: '#FFFFFF',
  green: '#2ECC71',
  yellow: '#F1C40F',
  red: '#E74C3C',
  teal: '#2DD4BF',
  shadow: 'rgba(0,0,0,0.2)',
};

export type ThemeMode = 'dark' | 'night';

export const ThemeColors = {
  dark: {
    background: Colors.navy900,
    surface: Colors.navy800,
    surfaceAlt: Colors.navy700,
    text: Colors.white,
    textMuted: Colors.slate500,
    accent: Colors.teal,
  },
  night: {
    background: '#071021',
    surface: '#0F1A2E',
    surfaceAlt: '#16233A',
    text: Colors.white,
    textMuted: Colors.slate500,
    accent: Colors.teal,
  },
};
