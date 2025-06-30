'use client';

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Flavor = { name: string; quantity: string | number };

export type LiquidProduct = {
  id: string;
  brand: string;
  volume: string;
  flavors: Flavor[];
};

interface Props {
  products: LiquidProduct[];
  onDiscard?: (brand: string, flavor: string) => void;
}

export default function DiscardLiquidForm({ products, onDiscard }: Props) {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LiquidProduct | null>(null);

  const brands = Array.from(new Set(products.map(p => p.brand)));
  const volumes = Array.from(
    new Set(
      products
        .filter(p => p.brand === selectedBrand)
        .map(p => p.volume)
    )
  );

  useEffect(() => {
    const found = products.find(
      (p) => p.brand === selectedBrand && p.volume === selectedVolume
    );
    setSelectedProduct(found || null);
  }, [selectedBrand, selectedVolume, products]);

  async function discardFlavor(flavorName: string) {
    if (!selectedProduct) return;

    const updatedFlavors = selectedProduct.flavors.map(fl => {
      const quantityNum = typeof fl.quantity === 'string' ? parseInt(fl.quantity, 10) : fl.quantity;
      if (isNaN(quantityNum)) return fl;
      if (fl.name === flavorName && quantityNum > 0) {
        return { ...fl, quantity: quantityNum - 1 };
      }
      return fl;
    });

    const ref = doc(db, "liquids", selectedProduct.id);
    await updateDoc(ref, { flavors: updatedFlavors });

    setSelectedProduct({ ...selectedProduct, flavors: updatedFlavors });
    onDiscard?.(selectedProduct.brand, flavorName);
  }



  return (
    <div className="space-y-4">
      <select
        value={selectedBrand ?? ''}
        onChange={(e) => {
          setSelectedBrand(e.target.value);
          setSelectedVolume(null);
        }}
        className="border p-2 w-full"
      >
        <option value="">-- Обрати бренд --</option>
        {brands.map(b => <option key={b} value={b}>{b}</option>)}
      </select>

      {selectedBrand && (
        <select
          value={selectedVolume ?? ''}
          onChange={(e) => setSelectedVolume(e.target.value)}
          className="border p-2 w-full"
        >
          <option value="">-- Обрати обʼєм --</option>
          {volumes.map(v => <option key={v} value={v}>{v} мл</option>)}
        </select>
      )}

      {selectedProduct && (
        <div className="space-y-2">
          <h2 className="font-semibold">Смаки:</h2>
          {selectedProduct.flavors.map(fl => (
            <div
              key={fl.name}
              className="flex justify-between items-center border p-2 rounded hover:bg-gray-100"
            >
              <span>{fl.name} — {fl.quantity} шт</span>
              <button
                onClick={() => discardFlavor(fl.name)}
                disabled={(() => {
                  const q = typeof fl.quantity === 'string' ? parseInt(fl.quantity, 10) : fl.quantity;
                  return isNaN(q) || q <= 0;
                })()}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                Списати 1
              </button>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
