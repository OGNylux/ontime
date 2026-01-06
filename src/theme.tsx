import { createTheme } from '@mui/material/styles';

// Figma Design Tokens
const theme = createTheme({
  typography: {
    fontFamily: 'Roboto, Inter, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#C27AFF',
          light: '#DAB2FF',
          dark: '#AD46FF',
          contrastText: '#FAFAFA',
        },
        secondary: {
          main: '#74D4FF',
          light: '#B8E6FE',
          dark: '#00BCFF',
          contrastText: '#FAFAFA',
        },
        background: {
          default: '#FAFAFA',
          paper: '#F5F5F5',
        },
        text: {
          primary: '#171717',
          secondary: '#525252',
          disabled: '#D4D4D4',
        },
        divider: '#E5E5E5',
        error: {
          main: '#dc2626',
          light: '#f87171',
          dark: '#991b1b',
          contrastText: '#FAFAFA',
        },
        warning: {
          main: '#fb923c',
          light: '#fdba74',
          dark: '#f97316',
          contrastText: '#FAFAFA',
        },
        info: {
          main: '#06b6d4',
          light: '#22d3ee',
          dark: '#0e7490',
          contrastText: '#FAFAFA',
        },
        success: {
          main: '#22c55e',
          light: '#4ade80',
          dark: '#16a34a',
          contrastText: '#FAFAFA',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#C27AFF',
          light: '#DAB2FF',
          dark: '#AD46FF',
          contrastText: '#FAFAFA',
        },
        secondary: {
          main: '#74D4FF',
          light: '#B8E6FE',
          dark: '#00BCFF',
          contrastText: '#FAFAFA',
        },
        background: {
          default: '#404040',
          paper: '#525252',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#E5E5E5',
          disabled: '#D4D4D4',
        },
        divider: '#737373',
        error: {
          main: '#dc2626',
          light: '#f87171',
          dark: '#991b1b',
          contrastText: '#FAFAFA',
        },
        warning: {
          main: '#fb923c',
          light: '#fdba74',
          dark: '#f97316',
          contrastText: '#FAFAFA',
        },
        info: {
          main: '#06b6d4',
          light: '#22d3ee',
          dark: '#0e7490',
          contrastText: '#FAFAFA',
        },
        success: {
          main: '#22c55e',
          light: '#4ade80',
          dark: '#16a34a',
          contrastText: '#FAFAFA',
        },
      },
    },
  }
});

export default theme;

