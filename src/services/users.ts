import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Timestamp } from 'firebase/firestore';

export type UserSettings = {
  theme: 'light' | 'dark';
  language: 'fr' | 'en';
};

export type UserDoc = {
  settings: UserSettings;
  createdAt: Timestamp | null;
};

const DEFAULTS: UserSettings = { theme: 'light', language: 'fr' };

export async function getUserDoc(uid: string): Promise<UserDoc> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { settings: DEFAULTS, createdAt: null };
  const data = snap.data();
  return {
    settings: { ...DEFAULTS, ...(data.settings ?? {}) },
    createdAt: data.createdAt ?? null,
  };
}

export async function updateUserSettings(uid: string, patch: Partial<UserSettings>): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.theme !== undefined) updates['settings.theme'] = patch.theme;
  if (patch.language !== undefined) updates['settings.language'] = patch.language;
  await updateDoc(doc(db, 'users', uid), updates);
}
