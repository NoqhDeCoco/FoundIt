import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Category, CategoryInput } from '@/types';

function categoriesRef(uid: string) {
  return collection(db, 'users', uid, 'categories');
}

export async function createCategory(uid: string, input: CategoryInput): Promise<Category> {
  const ref = await addDoc(categoriesRef(uid), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...input, createdAt: null as any };
}

export async function listCategories(uid: string): Promise<Category[]> {
  const snap = await getDocs(query(categoriesRef(uid), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
}

export async function updateCategory(
  uid: string,
  categoryId: string,
  data: Partial<CategoryInput>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'categories', categoryId), data);
}

export async function deleteCategory(uid: string, categoryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'categories', categoryId));
}
