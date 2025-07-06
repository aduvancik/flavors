import { db } from '@/lib/firebase';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

const COLLECTIONS = ['liquids', 'cartridges', 'nicoboosters'];

interface LiquidData {
  brand: string;
  flavors?: { name: string; quantity: number }[];
  quantity?: number; // для картриджів і нікобустерів
}

export const cleanUnavailableProducts = async () => {
  for (const col of COLLECTIONS) {
    const snap = await getDocs(collection(db, col));

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as LiquidData;
      const ref = doc(db, col, docSnap.id);

      // 🔹 Для liquids (мають flavors)
      if (col === 'liquids') {
        const validFlavors = (data.flavors ?? []).filter(f => Number(f.quantity) > 0);

        if (validFlavors.length === 0) {
          await deleteDoc(ref); // видаляємо весь бренд
          console.log(`🗑️ Deleted brand "${data.brand}" from ${col}`);
        } else if (validFlavors.length !== (data.flavors ?? []).length) {
          await setDoc(ref, { ...data, flavors: validFlavors });
          console.log(`✏️ Cleaned brand "${data.brand}" in ${col}`);
        }

        // 🔹 Для cartridges та nicoboosters (мають просто quantity)
      } else {
        if (!data.quantity || Number(data.quantity) <= 0) {
          await deleteDoc(ref);
          console.log(`🗑️ Deleted "${data.brand}" from ${col}`);
        }
      }
    }
  }
};
