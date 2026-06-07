import { Timestamp } from 'firebase/firestore';

// ─── Devises ────────────────────────────────────────────────────────────────

export type Currency = {
  code: string;   // ISO 4217 (ou custom)
  symbol: string;
  label: string;
};

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€',  label: 'Euro' },
  { code: 'USD', symbol: '$',  label: 'Dollar US' },
  { code: 'GBP', symbol: '£',  label: 'Livre Sterling' },
  { code: 'TRY', symbol: '₺',  label: 'Livre Turque' },
  { code: 'CHF', symbol: 'CHF', label: 'Franc Suisse' },
  { code: 'JPY', symbol: '¥',  label: 'Yen Japonais' },
  { code: 'MAD', symbol: 'DH', label: 'Dirham Marocain' },
  { code: 'CAD', symbol: 'CA$', label: 'Dollar Canadien' },
];

// ─── Catégorie ───────────────────────────────────────────────────────────────

export type Category = {
  id: string;
  name: string;
  createdAt: Timestamp;
};

// Données envoyées à Firestore (sans id)
export type CategoryInput = Omit<Category, 'id' | 'createdAt'>;

// ─── Trouvaille (Find) ───────────────────────────────────────────────────────

export type FindType = 'piece' | 'billet';

export type Location = {
  lat: number;
  lng: number;
  label?: string;
};

export type Find = {
  id: string;
  groupId: string;       // partagé entre plusieurs finds trouvés ensemble
  date: Timestamp;
  categoryId: string;
  type: FindType;
  currency: string;      // code ISO (ex: 'EUR')
  amount: number;        // valeur unitaire (ex: 0.01 pour 1 centime)
  qty: number;           // quantité de cette pièce/billet
  photoUrl?: string;
  location?: Location;
  createdAt: Timestamp;
};

// Données envoyées à Firestore (sans id)
export type FindInput = Omit<Find, 'id' | 'createdAt'>;
