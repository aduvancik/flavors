'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getRemainingTotal, sendAvailabilityAndSellerLog } from '@/lib/updateLog';
import { db } from '@/lib/firebase';

const TYPE_OPTIONS = ['liquids', 'cartridges', 'nicoboosters'];

export default function SellerPanel() {
  const [step, setStep] = useState<'type' | 'brand' | 'flavor'>('type');
  const [selectedType, setSelectedType] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'split' | ''>('');
  const [splitPayment, setSplitPayment] = useState({ cash: '', card: '' });
  const [log, setLog] = useState<any>(null);

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
        <div>
          <h2 className="text-lg font-semibold">Оберіть тип товару:</h2>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(type => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setStep('brand');
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'brand' && (
        <div>
          <button onClick={() => setStep('type')} className="text-blue-600">← Назад</button>
          <h2 className="mt-4 font-semibold">Оберіть бренд:</h2>
          {brands.filter(b => b.flavors?.length).map(b => (
            <button
              key={b.brand}
              onClick={() => {
                setSelectedBrand(b);
                setStep('flavor');
              }}
              className="block bg-gray-100 p-2 mt-2 rounded text-left w-full"
            >
              {b.brand}
            </button>
          ))}
        </div>
      )}

      {step === 'flavor' && selectedBrand && (
        <div>
          <button onClick={() => setStep('brand')} className="text-blue-600">← Назад</button>
          <h2 className="mt-4 font-semibold">Оберіть смак:</h2>
          {selectedBrand.flavors.map((fl: any, idx: number) => {
            const alreadyAdded = cart.filter(c => c.name === fl.name && c.productId === selectedBrand.id).length;
            const remaining = fl.quantity - alreadyAdded;

            return (
              <div key={idx} className="border p-2 rounded mt-2">
                <div><strong>{fl.name}</strong></div>
                <div>К-сть: {fl.quantity} (залишилось: {remaining})</div>
                <div>Ціна продажу: {selectedBrand.salePrice} грн</div>
                <div>ЗП продавця: {selectedBrand.sellerAmount} грн</div>
                <button
                  disabled={remaining < 1}
                  onClick={() => {
                    setCart([...cart, {
                      name: fl.name,
                      productId: selectedBrand.id,
                      salePrice: selectedBrand.salePrice,
                      sellerAmount: selectedBrand.sellerAmount,
                    }]);
                  }}
                  className="mt-2 bg-green-500 text-white px-3 py-1 rounded disabled:opacity-50"
                >
                  Додати до кошика
                </button>
              </div>
            );
          })}
        </div>
      )}

      {cart.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-bold">Кошик:</h3>
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between border-b py-1">
              <span>{item.name}</span>
              <span>{item.salePrice} грн</span>
            </div>
          ))}
          <div className="mt-2">
            <div><strong>Сума:</strong> {totalCartPrice} грн</div>
            <div><strong>ЗП продавця:</strong> {sellerSalary} грн</div>
            <div><strong>Моє:</strong> {myEarnings} грн</div>

            <div className="mt-2 space-y-1">
              <div>
                <label>
                  <input type="radio" name="pay" checked={paymentType === 'cash'} onChange={() => setPaymentType('cash')} /> Готівка
                </label>
              </div>
              <div>
                <label>
                  <input type="radio" name="pay" checked={paymentType === 'card'} onChange={() => setPaymentType('card')} /> Карта
                </label>
              </div>
              <div>
                <label>
                  <input type="radio" name="pay" checked={paymentType === 'split'} onChange={() => setPaymentType('split')} /> Розділити
                </label>
                {paymentType === 'split' && (
                  <div className="mt-1">
                    <input
                      type="number"
                      placeholder="Готівка"
                      value={splitPayment.cash}
                      onChange={e => setSplitPayment({ ...splitPayment, cash: e.target.value })}
                      className="border p-1 mr-2"
                    />
                    <input
                      type="number"
                      placeholder="Карта"
                      value={splitPayment.card}
                      onChange={e => setSplitPayment({ ...splitPayment, card: e.target.value })}
                      className="border p-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleSell} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Продано</button>

            {log && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-sm">
                <div><strong>Загальний товар (залишок):</strong> {log.total} грн</div>
                <div><strong>Готівка:</strong> {log.cash} грн</div>
                <div><strong>Карта:</strong> {log.card} грн</div>
                <div><strong>Загальна сума:</strong> {log.cash + log.card} грн</div>
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
