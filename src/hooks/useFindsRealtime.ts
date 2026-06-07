import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Find } from '@/types';

export function useFindsRealtime() {
  const { user } = useAuth();
  const [finds, setFinds] = useState<Find[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'finds'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setFinds(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Find)));
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [user]);

  return { finds, loading };
}
