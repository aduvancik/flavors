'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getRemainingTotal, sendAvailabilityAndSellerLog } from '@/lib/updateLog';
import { db } from '@/lib/firebase';

const TYPE_OPTIONS = [
  { key: 'liquids', label: 'Рідини', image: '/liquids.jpg' },
  { key: 'cartridges', label: 'Картриджі', image: '/cartridges.jpg' },
  { key: 'nicoboosters', label: 'Нікобустери', image: '/nicoboosters.jpg' },
];
export default function SellerPanel() {
  const [step, setStep] = useState<'type' | 'brand' | 'flavor'>('type');
  const [selectedType, setSelectedType] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'split' | ''>('');
  const [splitPayment, setSplitPayment] = useState({ cash: '', card: '' });
  const [log, setLog] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSellWithLoader = async () => {
    setIsLoading(true);
    try {
      await handleSell(); // твоя існуюча функція
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedType) {
      loadBrands();
    }
  }, [selectedType]);

  const loadBrands = async () => {
    const colSnap = await getDocs(collection(db, selectedType));
    const brandMap: Record<string, any> = {};

    colSnap.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;

      if (selectedType === 'liquids') {
        if (!brandMap[data.brand]) {
          brandMap[data.brand] = { ...data, id, flavors: [] };
        }
        brandMap[data.brand].flavors.push(...(data.flavors || []));
      } else {
        if (!brandMap[data.brand]) {
          brandMap[data.brand] = { ...data, id, flavors: [] };
        }
        brandMap[data.brand].flavors.push({
          name: data.brand,
          quantity: data.quantity ?? 0,
        });
      }
    });

    setBrands(Object.values(brandMap));
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + item.salePrice, 0);
  const sellerSalary = cart.reduce((sum, item) => sum + item.sellerAmount, 0);
  const myEarnings = totalCartPrice - sellerSalary;



  // Оновлення щоденної статистики продажів
  const updateDailySales = async (totalSum: number, profit: number) => {
    const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const dailyDocRef = doc(db, 'daily_sales', todayStr);

    const dailyDocSnap = await getDoc(dailyDocRef);
    if (dailyDocSnap.exists()) {
      await updateDoc(dailyDocRef, {
        totalSum: increment(totalSum),
        profit: increment(profit),
        salesCount: increment(1),
      });
    } else {
      await setDoc(dailyDocRef, {
        date: todayStr,
        totalSum,
        profit,
        salesCount: 1,
        createdAt: serverTimestamp(),
      });
    }
  };

  const handleSell = async () => {
    if (!cart.length || !paymentType) {
      alert('Оберіть товар та тип оплати');
      return;
    }

    let cash = 0;
    let card = 0;

    if (paymentType === 'cash') cash = totalCartPrice;
    if (paymentType === 'card') card = totalCartPrice;
    if (paymentType === 'split') {
      cash = Number(splitPayment.cash);
      card = Number(splitPayment.card);
      if (cash + card !== totalCartPrice) {
        alert('Сума не співпадає з загальною');
        return;
      }
    }

    const now = new Date();
    const timestamp = now.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    // 🧾 Формування повідомлення
    let saleMessage = `${timestamp}\nПродаж:\n`;

    const newlyDepleted: string[] = [];

    for (const item of cart) {
      const type = item.type || selectedType;
      const docRef = doc(db, type, item.productId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) continue;

      const data = docSnap.data();
      const brand = data.brand || '';
      const volume = data.volume ? `${data.volume} мл` : '';
      const name = item.name || '';

      let line = `${brand}`;
      if (volume) line += ` ${volume}`;
      if (name) line += ` - ${name}`;
      saleMessage += `${line}\n`;

      // Оновлення кількості та перевірка на зникнення
      if (type === 'liquids') {
        const updatedFlavors: any[] = [];

        for (const f of data.flavors || []) {
          if (f.name === item.name) {
            const newQty = Math.max((f.quantity || 0) - 1, 0);

            if (newQty === 0) {
              const depletedId = `liquids_${item.productId}_${f.name}`;
              const depletedRef = doc(db, 'depleted_flavors', depletedId);
              const depletedSnap = await getDoc(depletedRef);

              if (!depletedSnap.exists()) {
                newlyDepleted.push(`${brand} ${volume} - ${f.name}`);
                await setDoc(depletedRef, { depletedAt: now });
              }
            }

            if (newQty > 0) {
              updatedFlavors.push({ ...f, quantity: newQty });
            }
          } else {
            updatedFlavors.push(f);
          }
        }

        await updateDoc(docRef, { flavors: updatedFlavors });
      }
      else {
        const newQty = Math.max((data.quantity || 0) - 1, 0);

        if (newQty === 0) {
          const depletedId = `${type}_${item.productId}_main`;
          const depletedRef = doc(db, 'depleted_flavors', depletedId);
          const depletedSnap = await getDoc(depletedRef);
          if (!depletedSnap.exists()) {
            newlyDepleted.push(`${brand}${volume ? ' ' + volume : ''}`);
            await setDoc(depletedRef, { depletedAt: now });
          }
        }

        await updateDoc(docRef, { quantity: newQty });
      }
    }


    // Додаємо рядок з оплатою
    if (paymentType === 'split') {
      if (cash > 0 && card > 0) {
        saleMessage += `${cash} грн готівка + ${card} грн карта = ${cash + card}`;
      } else if (cash > 0) {
        saleMessage += `${cash} грн готівка`;
      } else if (card > 0) {
        saleMessage += `${card} грн карта`;
      }
    } else if (paymentType === 'cash') {
      saleMessage += `${cash} грн готівка`;
    } else if (paymentType === 'card') {
      saleMessage += `${card} грн карта`;
    }

    // Очистка стану
    setCart([]);
    setPaymentType('');
    setSplitPayment({ cash: '', card: '' });
    setSelectedBrand(null);
    setStep('type');

    await loadBrands();

    // 🔄 Оновлюємо лог
    const remainingTotal = await getRemainingTotal();

    const logRef = doc(db, 'seller_logs', 'current');
    const logSnap = await getDoc(logRef);
    const existing = logSnap.exists() ? logSnap.data() : {
      total: 0,
      cash: 0,
      card: 0,
      salary: 0,
      mine: 0,
    };

    const updated = {
      total: remainingTotal,
      cash: existing.cash + cash,
      card: existing.card + card,
      salary: existing.salary + sellerSalary,
      mine: existing.mine + myEarnings,
    };

    await setDoc(logRef, updated);
    setLog(updated);

    await updateDailySales(totalCartPrice, sellerSalary);
    await sendAvailabilityAndSellerLog(saleMessage, newlyDepleted);
  };


  return (
    <div className="p-4 space-y-4">
      {step === 'type' && (
        <div className="w-full max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center animate-fade-in">Оберіть тип товару</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in">
            {TYPE_OPTIONS.map((type) => (
              <button
                key={type.key}
                onClick={() => {
                  setSelectedType(type.key);
                  setStep('brand');
                }}
                className="relative group bg-gray-200 rounded-xl shadow-md overflow-hidden h-48 hover:scale-105 transition-transform duration-300"
              >
                <img
                  src={type.image}
                  alt={type.label}
                  className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-0" />
                <div className="relative z-10 flex items-center justify-center h-full">
                  <span className="text-xl font-semibold text-white tracking-wide">{type.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'brand' && (
        <div className="w-full max-w-5xl mx-auto animate-fade-in">
          <button
            onClick={() => setStep('type')}
            className="inline-flex items-center gap-1 text-black font-medium border border-black px-3 py-1 rounded hover:bg-black hover:text-white transition-colors mb-4"
          >
            ← Назад
          </button>

          <h2 className="text-2xl font-bold mb-6 text-center">Оберіть бренд</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {brands
              .filter((b) => b.flavors?.length)
              .map((b) => (
                <button
                  key={b.brand}
                  onClick={() => {
                    setSelectedBrand(b);
                    setStep('flavor');
                  }}
                  className="relative group rounded-xl shadow-md overflow-hidden h-48 hover:scale-105 transition-transform duration-300"
                >
                  {/* Картинка з Firebase */}
                  {b.imageUrl && (
                    <img
                      src={b.imageUrl}
                      alt={b.brand}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-0" />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-xl font-semibold text-white tracking-wide">{b.brand}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}


      {step === 'flavor' && selectedBrand && (
        <div className="max-w-md mx-auto p-4 bg-white rounded-md shadow-md">
          <button
            onClick={() => setStep('brand')}
            className="inline-flex items-center gap-1 text-black font-medium border border-black px-3 py-1 rounded hover:bg-black hover:text-white transition-colors mb-4"
          >
            ← Назад
          </button>

          <h2 className="mt-2 mb-4 text-xl font-semibold text-black">Оберіть смак:</h2>
          {selectedBrand.flavors.map((fl: any, idx: number) => {
            const alreadyAdded = cart.filter(
              (c) => c.name === fl.name && c.productId === selectedBrand.id
            ).length;
            const remaining = fl.quantity - alreadyAdded;

            return (
              <div
                key={idx}
                className="border border-gray-700 p-4 rounded-md mt-3 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="text-lg font-semibold text-black">{fl.name}</div>
                <div className="text-gray-800 mt-1">
                  К-сть: <span className="font-medium">{fl.quantity}</span> (залишилось:{' '}
                  <span className={remaining > 0 ? "text-black" : "text-gray-400 font-semibold"}>
                    {remaining}
                  </span>
                  )
                </div>
                <div className="text-gray-800 mt-1">
                  Ціна продажу: <span className="font-medium">{selectedBrand.salePrice} грн</span>
                </div>
                <div className="text-gray-800">
                  ЗП продавця: <span className="font-medium">{selectedBrand.sellerAmount} грн</span>
                </div>
                <button
                  disabled={remaining < 1}
                  onClick={() => {
                    setCart([
                      ...cart,
                      {
                        name: fl.name,
                        productId: selectedBrand.id,
                        salePrice: selectedBrand.salePrice,
                        sellerAmount: selectedBrand.sellerAmount,
                      },
                    ]);
                  }}
                  className={`mt-3 w-full py-2 rounded-md border border-black text-black font-semibold 
              disabled:text-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed 
              hover:bg-black hover:text-white transition-colors`}
                >
                  Додати до кошика
                </button>
              </div>
            );
          })}
        </div>
      )}



      {cart.length > 0 && (
        <div className="mt-8">
          <div className="max-w-md mx-auto p-5 bg-white border border-gray-300 rounded-xl shadow-md text-black space-y-4">
            <h3 className="text-xl font-bold border-b pb-2">🛒 Кошик</h3>

            {cart.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2 border-b last:border-b-0"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.salePrice} грн</div>
                </div>
                <button
                  onClick={() => {
                    const updated = [...cart];
                    updated.splice(idx, 1);
                    setCart(updated);
                  }}
                  className="text-gray-400 hover:text-black text-lg leading-none px-2 transition"
                  aria-label="Видалити"
                >
                  ×
                </button>
              </div>
            ))}

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="font-semibold">Сума:</span> <span>{totalCartPrice} грн</span></div>
              <div className="flex justify-between"><span>ЗП продавця:</span> <span>{sellerSalary} грн</span></div>
              <div className="flex justify-between"><span>Моє:</span> <span>{myEarnings} грн</span></div>
            </div>
            <div className="pt-2 space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="pay-cash"
                  name="pay"
                  checked={paymentType === 'cash'}
                  onChange={() => setPaymentType('cash')}
                  className="cursor-pointer"
                />
                <label htmlFor="pay-cash" className="cursor-pointer">Готівка</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="pay-card"
                  name="pay"
                  checked={paymentType === 'card'}
                  onChange={() => setPaymentType('card')}
                  className="cursor-pointer"
                />
                <label htmlFor="pay-card" className="cursor-pointer">Карта</label>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="pay-split"
                    name="pay"
                    checked={paymentType === 'split'}
                    onChange={() => setPaymentType('split')}
                    className="cursor-pointer"
                  />
                  <label htmlFor="pay-split" className="cursor-pointer">Розділити</label>
                </div>

                {paymentType === 'split' && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      placeholder="Готівка"
                      value={splitPayment.cash}
                      onChange={(e) => setSplitPayment({ ...splitPayment, cash: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Карта"
                      value={splitPayment.card}
                      onChange={(e) => setSplitPayment({ ...splitPayment, card: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>


            <button
              onClick={handleSellWithLoader}
              disabled={isLoading}
              className={`w-full py-2 rounded-md font-semibold border border-black transition-colors ${isLoading
                ? 'bg-gray-200 text-gray-500 cursor-wait'
                : 'text-black hover:bg-black hover:text-white'
                }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  <span>Обробка...</span>
                </div>
              ) : (
                'Продано'
              )}
            </button>


            {log && (
              <div className="mt-4 bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm space-y-1">
                <div><strong>Залишок товару:</strong> {log.total} грн</div>
                <div><strong>Готівка:</strong> {log.cash} грн</div>
                <div><strong>Карта:</strong> {log.card} грн</div>
                <div><strong>Сума:</strong> {log.cash + log.card} грн</div>
                <div><strong>ЗП продавця:</strong> {log.salary} грн</div>
                <div><strong>Моє:</strong> {log.mine} грн</div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
