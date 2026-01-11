import { useColorScheme } from '@mui/material/styles';

export function useThemeMode() {
  const { mode, setMode } = useColorScheme();

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const setLightMode = () => setMode('light');
  const setDarkMode = () => setMode('dark');
  const setSystemMode = () => setMode('system');

  return {
    mode,
    toggleMode,
    setLightMode,
    setDarkMode,
    setSystemMode,
  };
}
