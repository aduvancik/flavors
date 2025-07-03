'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getRemainingTotal } from '@/lib/updateLog';

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

    // Оновлення кількості товарів у базі
    for (const item of cart) {
      const docRef = doc(db, selectedType, item.productId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) continue;
      const data = docSnap.data();

      const updatedFlavors = (data.flavors || []).map((f: any) => {
        if (f.name === item.name) {
          return { ...f, quantity: Math.max((f.quantity || 0) - 1, 0) };
        }
        return f;
      }).filter((f: any) => f.quantity > 0);

      const updatePayload: any = selectedType === 'liquids'
        ? { flavors: updatedFlavors }
        : { quantity: Math.max((data.quantity || 0) - 1, 0) };

      await updateDoc(docRef, updatePayload);
    }

    setCart([]);
    setPaymentType('');
    setSplitPayment({ cash: '', card: '' });
    setSelectedBrand(null);
    setStep('type');

    await loadBrands();

    const remainingTotal = await getRemainingTotal();

    // Оновлення логів продавця
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

    // Оновлення статистики продажів за день
    await updateDailySales(totalCartPrice, sellerSalary);
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
