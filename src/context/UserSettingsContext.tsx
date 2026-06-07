import '@/i18n'; // initialise i18next au démarrage
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Timestamp } from 'firebase/firestore';
import i18n from '@/i18n';
import { useAuth } from './AuthContext';
import { getUserDoc, updateUserSettings, UserSettings } from '@/services/users';

type ContextType = {
  settings: UserSettings;
  createdAt: Timestamp | null;
  effectiveTheme: 'light' | 'dark';
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
};

const UserSettingsContext = createContext<ContextType>({
  settings: { theme: 'light', language: 'fr' },
  createdAt: null,
  effectiveTheme: 'light',
  updateSettings: async () => {},
});

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({ theme: 'light', language: 'fr' });
  const [createdAt, setCreatedAt] = useState<Timestamp | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserDoc(user.uid).then(({ settings: s, createdAt: c }) => {
      setSettings(s);
      setCreatedAt(c);
      i18n.changeLanguage(s.language);
    });
  }, [user]);

  const updateSettings = async (patch: Partial<UserSettings>) => {
    if (!user) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.language) i18n.changeLanguage(patch.language);
    await updateUserSettings(user.uid, patch);
  };

  return (
    <UserSettingsContext.Provider value={{ settings, createdAt, effectiveTheme: settings.theme, updateSettings }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(UserSettingsContext);
}
