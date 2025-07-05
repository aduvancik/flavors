import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  DocumentReference,
  Timestamp
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { doc } from 'firebase/firestore';

import { Flavor } from './FlavorInputs';

export default interface ProductData {
  brand: string;
  purchasePrice: number;
  salePrice: number;
  sellerAmount: number;
  imageUrl: string;
  createdAt: Timestamp;  // <-- замість any
  volume?: string;
  flavors?: Flavor[];
  quantity?: number;
}

export async function uploadImage(file: File): Promise<string> {
  const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function addOrUpdateProduct(
  type: 'liquids' | 'cartridges' | 'nicoboosters',
  productData: ProductData,
  existingDocId?: string
) {
  const colRef = collection(db, type);

  if (type === 'liquids' && existingDocId) {
    const docRef = doc(db, type, existingDocId);

    const snapshot = await getDocs(
      query(colRef, where('brand', '==', productData.brand), where('volume', '==', productData.volume))
    );

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const existing = snapshot.docs[0].data();

      const mergedFlavors = [...(productData.flavors || [])];

      for (const f of existing.flavors || []) {
        const index = mergedFlavors.findIndex(
          m => m.name.toLowerCase() === f.name.toLowerCase()
        );

        if (index !== -1) {
          const mergedQty = +mergedFlavors[index].quantity;
          const existingQty = +f.quantity;

          mergedFlavors[index].quantity = (mergedQty + existingQty).toString();
        } else {
          mergedFlavors.push(f);
        }
      }

      await updateDoc(docRef, { ...productData, flavors: mergedFlavors });
      return 'updated';
    } else {
      await addDoc(colRef, productData);
      return 'added';
    }
  } else {
    await addDoc(colRef, productData);
    return 'added';
  }
}
