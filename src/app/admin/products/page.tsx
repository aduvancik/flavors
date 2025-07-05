'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection, getDocs, doc, updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { sendAvailabilityAndSellerLog } from '@/lib/updateLog';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

const PRODUCT_TYPES = [
  { label: 'Рідини', value: 'liquids' },
  { label: 'Катриджі', value: 'cartridges' },
  { label: 'Нікобустери', value: 'nicoboosters' },
];

type Flavor = { name: string; quantity: number | '' };

type RawFlavor = {
  name: string;
  quantity: string | number;
};

type Product = {
  id: string;
  brand: string;
  volume?: string;
  purchasePrice: number;
  salePrice: number;
  sellerAmount: number;
  imageUrl: string;
  quantity?: number;
  flavors?: Flavor[];
};

export default function ProductsPage() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Для форми редагування
  const [brand, setBrand] = useState('');
  const [volume, setVolume] = useState('10');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [sellerAmount, setSellerAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [flavors, setFlavors] = useState<Flavor[]>([{ name: '', quantity: '' }]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  // Завантажити товари обраного типу
  useEffect(() => {
    if (!selectedType) {
      setProducts([]);
      setEditingProduct(null);
      return;
    }
    setLoading(true);
    const fetchProducts = async () => {
      try {
        const colRef = collection(db, selectedType);
        const snapshot = await getDocs(colRef);
        const prods = snapshot.docs.map(doc => {
          const data = doc.data();
          // Перетворюємо flavors.quantity в число
          if (data.flavors) {
            data.flavors = data.flavors.map((f: RawFlavor) => ({
              ...f,
              quantity: typeof f.quantity === 'string' ? parseInt(f.quantity, 10) : f.quantity
            }));
          }
          return { id: doc.id, ...data } as Product;
        });
        setProducts(prods);
      } catch (err) {
        console.error('Помилка завантаження товарів:', err);
        alert('Помилка завантаження товарів');
      }
      setLoading(false);
    };
    fetchProducts();
  }, [selectedType]);

  // Скидаємо форму при зміні типу товару
  useEffect(() => {
    setEditingProduct(null);
    setBrand('');
    setVolume('10');
    setPurchasePrice('');
    setSalePrice('');
    setSellerAmount('');
    setQuantity('');
    setImageFile(null);
    setImageUrl('');
    setFlavors([{ name: '', quantity: '' }]);
  }, [selectedType]);

  // Коли обираємо товар для редагування — заповнюємо поля
  const startEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setBrand(prod.brand);
    setPurchasePrice(prod.purchasePrice.toString());
    setSalePrice(prod.salePrice.toString());
    setSellerAmount(prod.sellerAmount.toString());
    setImageUrl(prod.imageUrl || '');
    setQuantity(prod.quantity !== undefined ? prod.quantity.toString() : '');
    setVolume(prod.volume || '10');
    setFlavors(prod.flavors && prod.flavors.length > 0
      ? prod.flavors.map(f => ({
        name: f.name,
        quantity: typeof f.quantity === 'number' ? f.quantity : (parseInt(f.quantity as string, 10) || 0),
      }))
      : [{ name: '', quantity: '' }]
    );
    setImageFile(null);
  };

  // Кнопка "Додати смак"
  const handleAddFlavor = () => {
    const last = flavors[flavors.length - 1];
    if (last.name.trim() && (last.quantity !== '' && last.quantity !== 0)) {
      setFlavors([...flavors, { name: '', quantity: '' }]);
    }
  };

  // Зміна смачного поля
  const handleFlavorChange = (index: number, field: keyof Flavor, value: string) => {
    const newFlavors = [...flavors];
    if (field === 'quantity') {
      const num = parseInt(value);
      newFlavors[index][field] = isNaN(num) ? '' : num;
    } else {
      newFlavors[index][field] = value;
    }
    setFlavors(newFlavors);
  };

  // Валідація полів перед збереженням
  const isValid = () => {
    if (!brand.trim()) return false;
    if (!purchasePrice.trim() || isNaN(+purchasePrice)) return false;
    if (!salePrice.trim() || isNaN(+salePrice)) return false;
    if (!sellerAmount.trim() || isNaN(+sellerAmount)) return false;
    if (!imageUrl && !imageFile) return false;

    if (selectedType === 'liquids') {
      if (!volume.trim()) return false;
      for (const f of flavors) {
        if (!f.name.trim()) return false;
        if (f.quantity === '' || isNaN(Number(f.quantity)) || Number(f.quantity) <= 0) return false;
      }
    } else {
      if (!quantity.trim() || isNaN(+quantity)) return false;
    }
    return true;
  };

  // Збереження оновленого товару
  const handleSave = async () => {
    if (!editingProduct) return;
    if (!isValid()) {
      alert('Будь ласка, заповніть всі поля правильно і додайте фото.');
      return;
    }
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}-${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      const docRef = doc(db, selectedType, editingProduct.id);

      const updatedData: Partial<Product> = {
        brand,
        purchasePrice: parseFloat(purchasePrice),
        salePrice: parseFloat(salePrice),
        sellerAmount: parseFloat(sellerAmount),
        imageUrl: finalImageUrl,
      };

      if (selectedType === 'liquids') {
        updatedData.volume = volume;
        updatedData.flavors = flavors.filter(f => f.name.trim() && f.quantity !== '' && f.quantity !== 0);
      } else {
        updatedData.quantity = parseInt(quantity);
      }

      await updateDoc(docRef, updatedData);
      const message = `✅ Товар оновлено!`;
      await sendAvailabilityAndSellerLog(message);
      alert('✅ Товар оновлено!');


      // Оновити локальний список товарів
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === editingProduct.id ? { ...p, ...updatedData } as Product : p
        )
      );
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
      alert('Помилка збереження');
    }
    setSaving(false);
  };

  // Скасувати редагування
  const cancelEdit = () => {
    setEditingProduct(null);
  };

  // Головний UI

  if (!selectedType) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white dark:bg-black text-black dark:text-white shadow-lg rounded-md space-y-6 text-center border border-gray-300 dark:border-gray-600 transition-all duration-300">

        <h1 className="text-2xl font-extrabold mb-4 tracking-wide">Виберіть тип товару для перегляду</h1>

        <div className="flex justify-center gap-4">
          {PRODUCT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className="px-6 py-3 border border-black dark:border-white rounded-md bg-white dark:bg-black text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-md transition-all duration-200 active:scale-95"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center font-semibold text-black dark:text-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (editingProduct) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white dark:bg-black text-black dark:text-white shadow-lg rounded-md space-y-6 border border-gray-300 dark:border-gray-600 transition-colors duration-300">

        <h2 className="text-xl font-bold mb-4 tracking-wide text-center">
          Редагування товару: {editingProduct.brand}
        </h2>

        <input
          value={brand}
          onChange={e => setBrand(e.target.value)}
          placeholder="Бренд"
          className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
        />

        {selectedType === 'liquids' && (
          <select
            value={volume}
            onChange={e => setVolume(e.target.value)}
            className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
          >
            <option value="10">10 мл</option>
            <option value="15">15 мл</option>
            <option value="30">30 мл</option>
          </select>
        )}

        <div>
          <label className="block mb-1 font-semibold">Фото товару</label>
          {imageUrl && !imageFile && (
            <img src={imageUrl} alt="Фото товару" className="mb-2 max-h-40 object-contain rounded-md" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={e => {
              setImageFile(e.target.files?.[0] || null);
              setImageUrl('');
            }}
            accept="image/*"
            className="cursor-pointer"
          />
        </div>

        <input
          value={purchasePrice}
          onChange={e => setPurchasePrice(e.target.value)}
          placeholder="Ціна закупки"
          className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
        />

        <input
          value={salePrice}
          onChange={e => setSalePrice(e.target.value)}
          placeholder="Ціна продажу"
          className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
        />

        <input
          value={sellerAmount}
          onChange={e => setSellerAmount(e.target.value)}
          placeholder="Сума продавцю"
          className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
        />

        {selectedType === 'liquids' && (
          <div className="space-y-3">
            <h3 className="font-semibold">Смаки</h3>
            {flavors.map((f, i) => (
              <div key={i} className="flex gap-3">
                <input
                  value={f.name}
                  onChange={e => handleFlavorChange(i, 'name', e.target.value)}
                  placeholder="Назва смаку"
                  className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
                />
                <input
                  type="number"
                  value={f.quantity === '' ? '' : f.quantity}
                  onChange={e => handleFlavorChange(i, 'quantity', e.target.value)}
                  placeholder="К-сть"
                  min={0}
                  className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-24 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
                />
              </div>
            ))}
            <button
              onClick={handleAddFlavor}
              type="button"
              className="text-blue-600 dark:text-blue-400 underline cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-300"
            >
              + Додати смак
            </button>
          </div>
        )}

        {selectedType !== 'liquids' && (
          <input
            type="number"
            placeholder="Кількість (шт)"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min={0}
            className="border border-gray-400 dark:border-gray-600 bg-transparent px-3 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors duration-300"
          />
        )}

        <div className="flex gap-4 mt-6">
          <button
            onClick={cancelEdit}
            className="border border-gray-400 dark:border-gray-600 py-2 px-4 rounded w-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-300"
            type="button"
          >
            Назад до списку
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !isValid()}
            className="bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded w-full hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 cursor-pointer transition-colors duration-300"
            type="button"
          >
            {saving ? 'Збереження...' : 'Зберегти зміни'}
          </button>
        </div>
      </div>
    );
  }


  // Список товарів для вибраного типу
  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-black text-black dark:text-white shadow-lg rounded-md border border-gray-300 dark:border-gray-600 transition-colors duration-300">

      <h1 className="text-2xl font-extrabold mb-6 text-center tracking-wide">
        Товари: {PRODUCT_TYPES.find(t => t.value === selectedType)?.label}
      </h1>

      {products.length === 0 && (
        <p className="text-center text-gray-600 dark:text-gray-400 font-medium">
          Немає товарів для цього типу.
        </p>
      )}

      <ul className="space-y-4">
        {products.map(prod => (
          <li
            key={prod.id}
            onClick={() => startEditProduct(prod)}
            className="flex items-center gap-4 p-4 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 select-none"
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') startEditProduct(prod) }}
          >
            <img
              src={prod.imageUrl}
              alt={prod.brand}
              className="w-16 h-16 object-contain flex-shrink-0 rounded"
              loading="lazy"
              draggable={false}
            />
            <div className="text-sm sm:text-base leading-snug">
              <p><b>Бренд:</b> {prod.brand}</p>
              {selectedType === 'liquids' ? (
                <p><b>Об’єм:</b> {prod.volume} мл</p>
              ) : (
                <p><b>Кількість:</b> {prod.quantity || 0} шт</p>
              )}
              <p><b>Ціна продажу:</b> {prod.salePrice} ₴</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setSelectedType('')}
          className="border border-gray-400 dark:border-gray-600 px-5 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        >
          Назад до вибору типу товару
        </button>
      </div>
    </div>

  );
}
