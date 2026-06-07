import { Colors } from '@/constants/theme';
import { useUserSettings } from '@/context/UserSettingsContext';

export function useTheme() {
  const { effectiveTheme } = useUserSettings();
  return Colors[effectiveTheme];
}
