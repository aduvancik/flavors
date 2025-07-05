'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProductData, { addOrUpdateProduct, uploadImage } from './firebaseUtils';
import { Flavor } from './FlavorInputs';
import { getRemainingTotal, sendAvailabilityAndSellerLog } from '@/lib/updateLog';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';

interface ArrivalFormProps {
  initialData?: {
    brand: string;
    purchasePrice: number;
    salePrice: number;
    sellerAmount: number;
    imageUrl: string;
    volume?: string;
    flavors?: Flavor[];
    quantity?: number;
    id?: string;
  };
  isEditMode?: boolean;
  onSaveComplete?: () => void;
}

const PRODUCT_TYPES = [
  { label: 'Рідини', value: 'liquids' },
  { label: 'Катриджі', value: 'cartridges' },
  { label: 'Нікобустери', value: 'nicoboosters' },
];

type ProductType = 'liquids' | 'cartridges' | 'nicoboosters';

export default function ArrivalForm({
  initialData,
  isEditMode = false,
  onSaveComplete,
}: ArrivalFormProps) {
  const [type, setType] = useState<ProductType>('liquids');
  const [brand, setBrand] = useState('');
  const [volume, setVolume] = useState('10');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [sellerAmount, setSellerAmount] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [quantity, setQuantity] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[]>([{ name: '', quantity: '' }]);

  useEffect(() => {
    if (initialData) {
      setBrand(initialData.brand || '');
      setPurchasePrice(initialData.purchasePrice?.toString() || '');
      setSalePrice(initialData.salePrice?.toString() || '');
      setSellerAmount(initialData.sellerAmount?.toString() || '');
      setImageUrl(initialData.imageUrl || '');
      setVolume(initialData.volume || '10');
      setQuantity(initialData.quantity?.toString() || '');

      if (isEditMode) {
        setFlavors(
          initialData.flavors?.length
            ? initialData.flavors.map(f => ({ name: f.name, quantity: f.quantity.toString() }))
            : [{ name: '', quantity: '' }]
        );
      } else {
        setFlavors([{ name: '', quantity: '' }]);
      }

      if (initialData.volume) setType('liquids');
      else if (initialData.quantity) setType('cartridges');
    }
  }, [initialData, isEditMode]);

  const handleAddFlavor = () => {
    const last = flavors[flavors.length - 1];
    if (`${last.name}`.trim() && `${last.quantity}`.trim()) {
      setFlavors([...flavors, { name: '', quantity: '' }]);
    }
  };

  const handleFlavorChange = (index: number, field: keyof Flavor, value: string) => {
    const newFlavors = [...flavors];
    newFlavors[index][field] = value;
    setFlavors(newFlavors);
  };

  const isValid = () => {
    if (!brand.trim() || !purchasePrice.trim() || !salePrice.trim() || !sellerAmount.trim()) return false;
    if (!image && !imageUrl) return false;

    if (type === 'liquids') {
      if (!volume.trim()) return false;
      for (const f of flavors) {
        if (!`${f.name}`.trim() || !`${f.quantity}`.trim() || isNaN(Number(f.quantity))) return false;
      }
    } else {
      if (!quantity.trim() || isNaN(Number(quantity))) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid()) {
      alert('❌ Заповніть всі обов’язкові поля та додайте фото');
      return;
    }

    setLoading(true);
    try {
      const finalImageUrl = image ? await uploadImage(image) : imageUrl;
      const productData: ProductData = {
        brand,
        purchasePrice: parseFloat(purchasePrice),
        salePrice: parseFloat(salePrice),
        sellerAmount: parseFloat(sellerAmount),
        imageUrl: finalImageUrl,
        createdAt: new Date(),
      };

      if (type === 'liquids') {
        productData.volume = volume;
        productData.flavors = flavors;
      } else {
        productData.quantity = parseInt(quantity);
      }

      const result = await addOrUpdateProduct(type, productData, initialData?.id);

      alert(result === 'updated' ? '✅ Товар оновлено!' : '✅ Новий товар додано!');

      try {
        await getRemainingTotal();
        const logRef = doc(db, 'seller_logs', 'current');
        const logSnap = await getDoc(logRef);
        if (!logSnap.exists()) {
          await sendAvailabilityAndSellerLog('✅ Новий лог створено');
        } else {
          await sendAvailabilityAndSellerLog(result === 'updated' ? '✅ Товар оновлено!' : '✅ Новий товар додано!');
        }
      } catch (err) {
        console.error('Помилка надсилання звіту:', err);
      }

      if (onSaveComplete) onSaveComplete();
      if (!isEditMode) {
        setBrand('');
        setPurchasePrice('');
        setSalePrice('');
        setSellerAmount('');
        setImage(null);
        setImageUrl('');
        setVolume('10');
        setQuantity('');
        setFlavors([{ name: '', quantity: '' }]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      alert('❌ Помилка збереження');
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-xl p-6 bg-black text-white shadow rounded-md space-y-4">
      <h2 className="text-xl font-bold">📦 {isEditMode ? 'Редагувати товар' : 'Додати товар'}</h2>

      <select value={type} onChange={(e) => setType(e.target.value as ProductType)} disabled={isEditMode} className="border p-2 w-full bg-black text-white">
        {PRODUCT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Бренд" className="border p-2 w-full bg-black text-white" />

      {type === 'liquids' && (
        <select value={volume} onChange={(e) => setVolume(e.target.value)} className="border p-2 w-full bg-black text-white" disabled={isEditMode}>
          <option value="10">10 мл</option>
          <option value="15">15 мл</option>
          <option value="30">30 мл</option>
        </select>
      )}

      <div>
        <label className="block mb-1">Фото</label>
        <input ref={fileInputRef} type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} accept="image/*" className="text-white" />
        {!image && imageUrl && (
          <div className="mt-2 relative w-full h-40">
            <Image src={imageUrl} alt="Фото товару" fill className="object-contain" />
          </div>
        )}
      </div>

      <input value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Ціна закупки" className="border p-2 w-full bg-black text-white" type="number" min="0" />
      <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Ціна продажу" className="border p-2 w-full bg-black text-white" type="number" min="0" />
      <input value={sellerAmount} onChange={(e) => setSellerAmount(e.target.value)} placeholder="Сума продавцю" className="border p-2 w-full bg-black text-white" type="number" min="0" />

      {type === 'liquids' && (
        <div className="space-y-2">
          <h3 className="font-semibold">Смаки</h3>
          {flavors.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input value={f.name} onChange={(e) => handleFlavorChange(i, 'name', e.target.value)} placeholder="Назва смаку" className="border p-2 w-full bg-black text-white" />
              <input type="number" value={f.quantity} onChange={(e) => handleFlavorChange(i, 'quantity', e.target.value)} placeholder="К-сть" className="border p-2 w-24 bg-black text-white" min="0" />
            </div>
          ))}
          <button onClick={handleAddFlavor} type="button" className="text-blue-400 underline">+ Додати смак</button>
        </div>
      )}

      {type !== 'liquids' && (
        <input type="number" placeholder="Кількість (шт)" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border p-2 w-full bg-black text-white" min="0" />
      )}

      <button onClick={handleSubmit} disabled={loading || !isValid()} className="bg-white text-black py-2 px-4 rounded w-full hover:bg-gray-200 disabled:opacity-50">
        {loading ? (isEditMode ? 'Оновлення...' : 'Збереження...') : isEditMode ? 'Оновити товар' : 'Зберегти товар'}
      </button>
    </div>
  );
}
