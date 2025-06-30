'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addOrUpdateProduct, uploadImage } from './firebaseUtils';
import { Flavor } from './FlavorInputs';

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
    id?: string; // id документа для оновлення
  };
  isEditMode?: boolean;
  onSaveComplete?: () => void;
}

const PRODUCT_TYPES = [
  { label: 'Рідини', value: 'liquids' },
  { label: 'Катриджі', value: 'cartridges' },
  { label: 'Нікобустери', value: 'nicoboosters' },
];

export default function ArrivalForm({
  initialData,
  isEditMode = false,
  onSaveComplete,
}: ArrivalFormProps) {
  // Стан завжди рядки, щоб value в input було string
  const [type, setType] = useState('liquids');
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

  // При редагуванні ініціалізуємо стани
  useEffect(() => {
    if (initialData) {
      setBrand(initialData.brand || '');
      setPurchasePrice(initialData.purchasePrice?.toString() || '');
      setSalePrice(initialData.salePrice?.toString() || '');
      setSellerAmount(initialData.sellerAmount?.toString() || '');
      setImageUrl(initialData.imageUrl || '');
      setVolume(initialData.volume || '10');
      setQuantity(initialData.quantity?.toString() || '');
      setFlavors(
        initialData.flavors && initialData.flavors.length > 0
          ? initialData.flavors.map(f => ({
            name: f.name,
            quantity: f.quantity.toString(),
          }))
          : [{ name: '', quantity: '' }]
      );
      // Визначаємо тип залежно від наявності volume або quantity
      if (initialData.volume) setType('liquids');
      else if (initialData.quantity) setType('cartridges'); // або nicoboosters, логіку можна розширити
    }
  }, [initialData]);

  // Додавання нового смаку
  const handleAddFlavor = () => {
    const last = flavors[flavors.length - 1];
    const lastName = last.name || '';
    const lastQuantity = typeof last.quantity === 'string' ? last.quantity : String(last.quantity);

    if (lastName.trim() && lastQuantity.trim()) {
      setFlavors([...flavors, { name: '', quantity: '' }]);
    }
  };


  // Зміна смаку
  const handleFlavorChange = (index: number, field: keyof Flavor, value: string) => {
    const newFlavors = [...flavors];
    newFlavors[index][field] = value;
    setFlavors(newFlavors);
  };

  // Перевірка валідності форми
  const isValid = () => {
    if (!brand.trim()) return false;
    if (!purchasePrice.trim() || isNaN(Number(purchasePrice))) return false;
    if (!salePrice.trim() || isNaN(Number(salePrice))) return false;
    if (!sellerAmount.trim() || isNaN(Number(sellerAmount))) return false;

    // Якщо редагуємо і є вже фото — image може бути пустим (не оновлюємо)
    if (!image && !imageUrl) return false;

    if (type === 'liquids') {
      if (!volume.trim()) return false;
      for (const f of flavors) {
        const name = f.name;
        const quantity = f.quantity;

        if (typeof name !== 'string' || !name.trim()) return false;

        // quantity може бути рядком або числом
        if (
          (typeof quantity === 'string' && (!quantity.trim() || isNaN(Number(quantity)))) ||
          (typeof quantity === 'number' && isNaN(quantity))
        ) {
          return false;
        }
      }
    }
    else {
      if (!quantity.trim() || isNaN(Number(quantity))) return false;
    }

    return true;
  };

  // Збереження
  const handleSubmit = async () => {
    if (!isValid()) {
      alert('❌ Заповніть всі обов’язкові поля та додайте фото');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUrl;

      if (image) {
        finalImageUrl = await uploadImage(image);
      }

      const productData = {
        brand,
        purchasePrice: parseFloat(purchasePrice),
        salePrice: parseFloat(salePrice),
        sellerAmount: parseFloat(sellerAmount),
        imageUrl: finalImageUrl,
        createdAt: new Date(), // серверний timestamp, якщо треба, додай серверний з firebase
      } as any;

      if (type === 'liquids') {
        productData.volume = volume;
        productData.flavors = flavors.map(f => ({
          name: f.name,
          quantity: f.quantity,
        }));
      } else {
        productData.quantity = parseInt(quantity);
      }

      // Якщо редагування, передаємо id документу для оновлення
      const existingDocId = initialData?.id;

      const result = await addOrUpdateProduct(type as any, productData, existingDocId);

      alert(result === 'updated' ? '✅ Товар оновлено!' : '✅ Новий товар додано!');

      if (onSaveComplete) onSaveComplete();

      // Якщо не редагуємо, очищаємо форму
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
    <div className="max-w-xl p-6 bg-white shadow rounded-md space-y-4">
      <h2 className="text-xl font-bold">📦 {isEditMode ? 'Редагувати товар' : 'Додати товар'}</h2>

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        disabled={isEditMode} // Не можна змінювати тип при редагуванні
        className="border p-2 w-full"
      >
        {PRODUCT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <input
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        placeholder="Бренд"
        className="border p-2 w-full"
      />

      {type === 'liquids' && (
        <select
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="border p-2 w-full"
          disabled={isEditMode}
        >
          <option value="10">10 мл</option>
          <option value="15">15 мл</option>
          <option value="30">30 мл</option>
        </select>
      )}

      <div>
        <label className="block mb-1">Фото</label>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          accept="image/*"
        />
        {!image && imageUrl && (
          <div className="mt-2">
            <img src={imageUrl} alt="Існуюче фото" className="max-w-xs max-h-40 object-contain" />
          </div>
        )}
      </div>

      <input
        value={purchasePrice}
        onChange={(e) => setPurchasePrice(e.target.value)}
        placeholder="Ціна закупки"
        className="border p-2 w-full"
        type="number"
        min="0"
      />

      <input
        value={salePrice}
        onChange={(e) => setSalePrice(e.target.value)}
        placeholder="Ціна продажу"
        className="border p-2 w-full"
        type="number"
        min="0"
      />

      <input
        value={sellerAmount}
        onChange={(e) => setSellerAmount(e.target.value)}
        placeholder="Сума продавцю"
        className="border p-2 w-full"
        type="number"
        min="0"
      />

      {type === 'liquids' && (
        <div className="space-y-2">
          <h3 className="font-semibold">Смаки</h3>
          {flavors.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={f.name}
                onChange={(e) => handleFlavorChange(i, 'name', e.target.value)}
                placeholder="Назва смаку"
                className="border p-2 w-full"
              />
              <input
                type="number"
                value={f.quantity}
                onChange={(e) => handleFlavorChange(i, 'quantity', e.target.value)}
                placeholder="К-сть"
                className="border p-2 w-24"
                min="0"
              />
            </div>
          ))}
          <button onClick={handleAddFlavor} type="button" className="text-blue-600 underline">
            + Додати смак
          </button>
        </div>
      )}

      {type !== 'liquids' && (
        <input
          type="number"
          placeholder="Кількість (шт)"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="border p-2 w-full"
          min="0"
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !isValid()}
        className="bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (isEditMode ? 'Оновлення...' : 'Збереження...') : isEditMode ? 'Оновити товар' : 'Зберегти товар'}
      </button>
    </div>
  );
}
