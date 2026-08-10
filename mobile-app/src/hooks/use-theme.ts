import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useApp } from '@/context/AppContext';

export function useTheme() {
  try {
    const { themeMode } = useApp();
    return Colors[themeMode];
  } catch (err) {
    const scheme = useColorScheme();
    const theme = (scheme === 'dark') ? 'dark' : 'light';
    return Colors[theme];
  }
}
