'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection, getDocs, doc, updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const PRODUCT_TYPES = [
  { label: 'Рідини', value: 'liquids' },
  { label: 'Катриджі', value: 'cartridges' },
  { label: 'Нікобустери', value: 'nicoboosters' },
];

type Flavor = { name: string; quantity: number | '' };

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
            data.flavors = data.flavors.map((f: any) => ({
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
      <div className="max-w-xl mx-auto p-6 bg-white shadow rounded-md space-y-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Виберіть тип товару для перегляду</h1>
        <div className="flex justify-center gap-4">
          {PRODUCT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className="bg-blue-600 text-white py-3 px-6 rounded hover:bg-blue-700"
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
      <div className="max-w-xl mx-auto p-6 text-center font-semibold">
        Завантаження товарів...
      </div>
    );
  }

  if (editingProduct) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white shadow rounded-md space-y-4">
        <h2 className="text-xl font-bold mb-4">Редагування товару: {editingProduct.brand}</h2>

        <input
          value={brand}
          onChange={e => setBrand(e.target.value)}
          placeholder="Бренд"
          className="border p-2 w-full"
        />

        {selectedType === 'liquids' && (
          <select
            value={volume}
            onChange={e => setVolume(e.target.value)}
            className="border p-2 w-full"
          >
            <option value="10">10 мл</option>
            <option value="15">15 мл</option>
            <option value="30">30 мл</option>
          </select>
        )}

        <div>
          <label className="block mb-1 font-semibold">Фото товару</label>
          {imageUrl && !imageFile && (
            <img src={imageUrl} alt="Фото товару" className="mb-2 max-h-40 object-contain" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={e => {
              setImageFile(e.target.files?.[0] || null);
              setImageUrl('');
            }}
            accept="image/*"
          />
        </div>

        <input
          value={purchasePrice}
          onChange={e => setPurchasePrice(e.target.value)}
          placeholder="Ціна закупки"
          className="border p-2 w-full"
        />

        <input
          value={salePrice}
          onChange={e => setSalePrice(e.target.value)}
          placeholder="Ціна продажу"
          className="border p-2 w-full"
        />

        <input
          value={sellerAmount}
          onChange={e => setSellerAmount(e.target.value)}
          placeholder="Сума продавцю"
          className="border p-2 w-full"
        />

        {selectedType === 'liquids' && (
          <div className="space-y-2">
            <h3 className="font-semibold">Смаки</h3>
            {flavors.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={f.name}
                  onChange={e => handleFlavorChange(i, 'name', e.target.value)}
                  placeholder="Назва смаку"
                  className="border p-2 w-full"
                />
                <input
                  type="number"
                  value={f.quantity === '' ? '' : f.quantity}
                  onChange={e => handleFlavorChange(i, 'quantity', e.target.value)}
                  placeholder="К-сть"
                  className="border p-2 w-24"
                  min={0}
                />
              </div>
            ))}
            <button
              onClick={handleAddFlavor}
              type="button"
              className="text-blue-600 underline"
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
            className="border p-2 w-full"
            min={0}
          />
        )}

        <div className="flex gap-4 mt-4">
          <button
            onClick={cancelEdit}
            className="border border-gray-400 py-2 px-4 rounded w-full hover:bg-gray-100"
          >
            Назад до списку
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !isValid()}
            className="bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Збереження...' : 'Зберегти зміни'}
          </button>
        </div>
      </div>
    );
  }

  // Список товарів для вибраного типу
  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow rounded-md">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Товари: {PRODUCT_TYPES.find(t => t.value === selectedType)?.label}
      </h1>

      {products.length === 0 && <p className="text-center">Немає товарів для цього типу.</p>}

      <ul className="space-y-3">
        {products.map(prod => (
          <li
            key={prod.id}
            className="border p-3 rounded hover:bg-gray-50 cursor-pointer flex items-center gap-3"
            onClick={() => startEditProduct(prod)}
          >
            <img src={prod.imageUrl} alt={prod.brand} className="w-16 h-16 object-contain" />
            <div>
              <p><b>Бренд:</b> {prod.brand}</p>
              {selectedType === 'liquids' && <p><b>Об’єм:</b> {prod.volume} мл</p>}
              {selectedType !== 'liquids' && <p><b>Кількість:</b> {prod.quantity || 0} шт</p>}
              <p><b>Ціна продажу:</b> {prod.salePrice} ₴</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setSelectedType('')}
          className="border border-gray-400 py-2 px-4 rounded hover:bg-gray-100"
        >
          Назад до вибору типу товару
        </button>
      </div>
    </div>
  );
}
