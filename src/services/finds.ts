import {
  collection,
  doc,
  addDoc,
  writeBatch,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Find, FindInput } from '@/types';

function findsRef(uid: string) {
  return collection(db, 'users', uid, 'finds');
}

/** Crée une seule trouvaille. */
export async function createFind(uid: string, input: FindInput): Promise<Find> {
  const ref = await addDoc(findsRef(uid), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...input, createdAt: null as any };
}

/**
 * Crée plusieurs trouvailles partageant le même groupId (trouvées ensemble).
 * Utilise un batch pour l'atomicité.
 */
export async function createFindGroup(uid: string, inputs: FindInput[]): Promise<void> {
  const batch = writeBatch(db);
  inputs.forEach((input) => {
    const ref = doc(findsRef(uid));
    batch.set(ref, { ...input, createdAt: serverTimestamp() });
  });
  await batch.commit();
}

/** Liste toutes les trouvailles, triées par date décroissante. */
export async function listFinds(uid: string): Promise<Find[]> {
  const snap = await getDocs(query(findsRef(uid), orderBy('date', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Find));
}

/** Liste les trouvailles d'une catégorie. */
export async function listFindsByCategory(uid: string, categoryId: string): Promise<Find[]> {
  const snap = await getDocs(
    query(findsRef(uid), where('categoryId', '==', categoryId), orderBy('date', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Find));
}

/** Liste les trouvailles d'un groupe (même groupId). */
export async function listFindsByGroup(uid: string, groupId: string): Promise<Find[]> {
  const snap = await getDocs(
    query(findsRef(uid), where('groupId', '==', groupId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Find));
}

export async function updateFind(
  uid: string,
  findId: string,
  data: Partial<FindInput>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'finds', findId), data);
}

export async function deleteFind(uid: string, findId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'finds', findId));
}

/** Supprime toutes les trouvailles d'un groupe. */
export async function deleteFindGroup(uid: string, groupId: string): Promise<void> {
  const finds = await listFindsByGroup(uid, groupId);
  const batch = writeBatch(db);
  finds.forEach((f) => batch.delete(doc(db, 'users', uid, 'finds', f.id)));
  await batch.commit();
}
