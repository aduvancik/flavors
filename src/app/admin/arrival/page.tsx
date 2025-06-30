'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ArrivalForm from '@/components/ArrivalForm/ArrivalForm';

type Flavor = { name: string; quantity: string };

type LiquidProduct = {
  id: string;
  brand: string;
  volume: string;
  purchasePrice: number;
  salePrice: number;
  sellerAmount: number;
  imageUrl: string;
  flavors: Flavor[];
};


export default function Page() {
  const [mode, setMode] = useState<'choose' | 'new' | 'edit'>('choose');
  const [brands, setBrands] = useState<LiquidProduct[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<LiquidProduct | null>(null);

  // Завантажуємо унікальні бренди рідин при виборі режиму edit
  useEffect(() => {
    if (mode === 'edit') {
      loadBrands();
    }
  }, [mode]);

  async function loadBrands() {
    setLoadingBrands(true);
    try {
      const colRef = collection(db, 'liquids');
      const snapshot = await getDocs(colRef);
      // Зберігаємо унікальні бренди (перший документ бренду)
      const uniqueBrandsMap = new Map<string, LiquidProduct>();
      snapshot.docs.forEach(doc => {
        const data = doc.data() as LiquidProduct;
        if (!uniqueBrandsMap.has(data.brand)) {
          uniqueBrandsMap.set(data.brand, { ...data, id: doc.id });  // <-- змінив порядок
        }
      });

      setBrands(Array.from(uniqueBrandsMap.values()));
    } catch (err) {
      console.error('Помилка завантаження брендів:', err);
      alert('Помилка завантаження брендів');
    }
    setLoadingBrands(false);
  }

  // Обробка вибору бренду для редагування
  function onSelectBrand(brand: LiquidProduct) {
    setSelectedBrand(brand);
  }

  // Повернутись до вибору режиму
  function onBackToChoose() {
    setMode('choose');
    setSelectedBrand(null);
  }

  // Після збереження у ArrivalForm повернутись до вибору режиму
  function onSaveComplete() {
    setSelectedBrand(null);
    setMode('choose');
  }

  // --- UI ---

  if (mode === 'choose') {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white shadow rounded-md space-y-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Що бажаєте зробити?</h1>
        <div className="flex flex-col gap-4">
          <button
            className="bg-blue-600 text-white py-3 px-6 rounded hover:bg-blue-700"
            onClick={() => setMode('new')}
          >
            Додати нову рідину
          </button>
          <button
            className="bg-green-600 text-white py-3 px-6 rounded hover:bg-green-700"
            onClick={() => setMode('edit')}
          >
            Додати в існуючий бренд
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'edit') {
    if (loadingBrands) {
      return <p className="text-center mt-10">Завантаження брендів...</p>;
    }

    if (selectedBrand) {
      // Відкриваємо ArrivalForm з початковими даними для редагування
      return (
        <div>
          <button
            onClick={() => setSelectedBrand(null)}
            className="mb-4 border px-4 py-2 rounded hover:bg-gray-100"
          >
            ← Назад до списку брендів
          </button>

          <ArrivalForm
            initialData={selectedBrand}
            isEditMode={true}
            onSaveComplete={onSaveComplete}
          />
        </div>
      );
    }

    return (
      <div className="max-w-xl mx-auto p-6 bg-white shadow rounded-md space-y-4">
        <h2 className="text-xl font-bold mb-4">Оберіть бренд для редагування</h2>
        {brands.length === 0 && <p>Брендів не знайдено</p>}
        <ul className="space-y-2">
          {brands.map((brand) => (
            <li
              key={brand.id}
              className="border p-3 rounded cursor-pointer hover:bg-gray-50"
              onClick={() => onSelectBrand(brand)}
            >
              {brand.brand}
            </li>
          ))}
        </ul>
        <button
          onClick={onBackToChoose}
          className="mt-6 border px-4 py-2 rounded hover:bg-gray-100"
        >
          ← Назад
        </button>
      </div>
    );
  }

  if (mode === 'new') {
    // Тут рендеримо звичайний ArrivalForm для додавання нового товару
    return (
      <div>
        <button
          onClick={onBackToChoose}
          className="mb-4 border px-4 py-2 rounded hover:bg-gray-100"
        >
          ← Назад
        </button>

        <ArrivalForm
          onSaveComplete={onSaveComplete}
        />
      </div>
    );
  }

  return null;
}
