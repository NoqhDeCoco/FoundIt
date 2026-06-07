import { Timestamp } from 'firebase/firestore';
import { CURRENCIES } from '@/types';

export function formatAmount(amount: number, qty: number, currencyCode: string): string {
  const curr = CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = curr?.symbol ?? currencyCode;

  const valueLabel = amount < 1
    ? `${Math.round(amount * 100)}c`
    : `${amount % 1 === 0 ? amount : amount.toFixed(2)}`;

  return `${qty}x ${valueLabel} ${symbol}`;
}

export function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp) return '—';
  return timestamp.toDate().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}
