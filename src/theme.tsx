import { createTheme, ThemeOptions } from '@mui/material/styles';

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#a855f7',
      light: '#c084fc',
      dark: '#9333ea',
      contrastText: '#f8fafc',
    },
    secondary: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0ea5e9',
      contrastText: '#020617',
    },
    background: {
      default: '#262626',
      paper: '#171717',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#f1f5f9',
      disabled: '#e2e8f0',
      //hint: '#cbd5e1',
    },
    error: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#991b1b',
      contrastText: '#f8fafc',
    },
    warning: {
      main: '#fb923c',
      light: '#fdba74',
      dark: '#f97316',
      contrastText: '#f8fafc',
    },
    info: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0e7490',
      contrastText: '#020617',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
      contrastText: '#020617',
    },
    divider: '#171717',
  },
};

const theme = createTheme(themeOptions);

export default theme;

