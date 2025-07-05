"use client";

import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ArrivalForm from "@/components/ArrivalForm/ArrivalForm";
import { getRemainingTotal, sendReportAndAvailability } from "@/lib/updateLog";
import Link from "next/link";

// Типи

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

// Компонент

export default function Page() {
  const [mode, setMode] = useState<"choose" | "new" | "edit">("choose");
  const [brands, setBrands] = useState<LiquidProduct[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<LiquidProduct | null>(null);

  useEffect(() => {
    if (mode === "edit") loadBrands();
  }, [mode]);

  async function loadBrands() {
    setLoadingBrands(true);
    try {
      const colRef = collection(db, "liquids");
      const snapshot = await getDocs(colRef);
      const uniqueBrandsMap = new Map<string, LiquidProduct>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as LiquidProduct;
        if (!uniqueBrandsMap.has(data.brand)) {
          uniqueBrandsMap.set(data.brand, { ...data, id: doc.id });
        }
      });
      setBrands(Array.from(uniqueBrandsMap.values()));
    } catch (err) {
      console.error("Помилка завантаження брендів:", err);
      alert("Помилка завантаження брендів");
    }
    setLoadingBrands(false);
  }

  function onSelectBrand(brand: LiquidProduct) {
    setSelectedBrand(brand);
  }

  function onBackToChoose() {
    setMode("choose");
    setSelectedBrand(null);
  }

  async function onSaveComplete() {
    try {
      const newTotal = await getRemainingTotal();
      const logRef = doc(db, "seller_logs", "current");
      const logSnap = await getDoc(logRef);
      const existing = logSnap.exists()
        ? logSnap.data()
        : { cash: 0, card: 0, salary: 0, mine: 0 };

      await sendReportAndAvailability(
        {
          total: newTotal,
          cash: existing.cash,
          card: existing.card,
          salary: existing.salary,
          mine: existing.mine,
        },
        "✅ Збережено товар через ArrivalForm"
      );
    } catch (err) {
      console.error("Помилка надсилання звіту:", err);
    }

    setSelectedBrand(null);
    setMode("choose");
  }

  const baseStyle =
    " min-h-screen px-4 py-6 text-white bg-black space-y-6";

  if (mode === "choose") {
    return (
      <div className={baseStyle}>
        <div className="max-w-xl min-h-screen px-4 py-6 space-y-6 mx-auto">
          <h1 className="text-2xl font-bold text-center">Що бажаєте зробити?</h1>
          <div className="flex flex-col gap-4">
            <button
              className="bg-blue-600 hover:bg-blue-700 py-3 px-6 rounded shadow cursor-pointer ease-in duration-300"
              onClick={() => setMode("new")}
            >
              ➕ Додати нову рідину
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 py-3 px-6 rounded shadoц cursor-pointer ease-in duration-300"
              onClick={() => setMode("edit")}
            >
              🛠️ Додати в існуючий бренд
            </button>
            <Link
              href="/admin"
              className="inline-block border px-4 py-2 rounded hover:bg-gray-100 hover:text-black duration-300 ease-in"
            >
              ← Назад до адмін панелі
            </Link>
          </div>
        </div></div>
    );
  }

  if (mode === "edit") {
    if (loadingBrands) {
      return <div className={baseStyle}>Завантаження брендів...</div>;
    }

    if (selectedBrand) {
      return (
        <div className={baseStyle}>
          <button
            onClick={() => setSelectedBrand(null)}
            className="mb-4 text-sm underline text-gray-400 hover:text-white"
          >
            ← Назад до списку брендів
          </button>
          <ArrivalForm
            initialData={selectedBrand}
            isEditMode={false}
            onSaveComplete={onSaveComplete}
          />
        </div>
      );
    }

    return (
      <div className={baseStyle}>
        <h2 className="text-xl font-bold">Оберіть бренд для редагування</h2>
        {brands.length === 0 && <p>Брендів не знайдено</p>}
        <ul className="space-y-2">
          {brands.map((brand) => (
            <li
              key={brand.id}
              className="border border-gray-600 p-3 rounded hover:bg-gray-800 cursor-pointer"
              onClick={() => onSelectBrand(brand)}
            >
              {brand.brand}
            </li>
          ))}
        </ul>
        <button
          onClick={onBackToChoose}
          className="mt-6 underline text-sm text-gray-400 hover:text-white"
        >
          ← Назад
        </button>
      </div>
    );
  }

  if (mode === "new") {
    return (
      <div className={baseStyle}>
        <button
          onClick={onBackToChoose}
          className="mb-4 text-sm underline text-gray-400 hover:text-white"
        >
          ← Назад
        </button>
        <ArrivalForm onSaveComplete={onSaveComplete} />
      </div>
    );
  }

  return null;
}
