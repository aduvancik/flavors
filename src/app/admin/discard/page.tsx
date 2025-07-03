'use client';
//diskard
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import DiscardLiquidForm, { LiquidProduct } from "@/components/DiscardLiquidForm/DiscardLiquidForm";
import { sendAvailabilityAndSellerLog } from "@/lib/updateLog";

export default function DiscardPage() {
  const [products, setProducts] = useState<LiquidProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const colRef = collection(db, "liquids");
      const snapshot = await getDocs(colRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as LiquidProduct[];
      setProducts(data);
      setLoading(false);
    }
    load();
  }, []);

  // Ось тут
  async function handleDiscard(brand: string, flavor: string) {
    alert(`✅ Списано 1 одиницю: ${brand} – ${flavor}`);
    await sendAvailabilityAndSellerLog(`✅ Списано 1 одиницю: ${brand} – ${flavor}`);
  }

  return (
    <div className="p-6 space-y-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">🗑️ Списати рідину</h1>

      <Link
        href="/admin"
        className="inline-block border px-4 py-2 rounded hover:bg-gray-100"
      >
        ← Назад до адмін панелі
      </Link>

      {loading ? (
        <p>Завантаження товарів...</p>
      ) : (
        <DiscardLiquidForm
          products={products}
          onDiscard={handleDiscard}  // Передаємо функцію без alert тут
        />
      )}
    </div>
  );
}
