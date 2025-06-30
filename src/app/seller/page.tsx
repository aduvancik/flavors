'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, getDoc, setDoc } from 'firebase/firestore';
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
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    if (selectedType) {
      loadBrands();
    }
  }, [selectedType]);

  const loadBrands = async () => {
    setLoadingBrands(true);
    try {
      const colSnap = await getDocs(collection(db, selectedType));
      const brandMap: Record<string, any> = {};

      colSnap.forEach(doc => {
        const data = doc.data();
        if (!brandMap[data.brand]) brandMap[data.brand] = { ...data, id: doc.id, flavors: [] };
        brandMap[data.brand].flavors.push(...(data.flavors || []));
      });

      setBrands(Object.values(brandMap));
    } finally {
      setLoadingBrands(false);
    }
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + item.salePrice, 0);
  const sellerSalary = cart.reduce((sum, item) => sum + item.sellerAmount, 0);
  const myEarnings = totalCartPrice - sellerSalary;

  const getRemainingTotal = async () => {
    let sum = 0;
    for (const type of TYPE_OPTIONS) {
      const snap = await getDocs(collection(db, type));
      snap.forEach(doc => {
        const data = doc.data();
        const salePrice = data.salePrice || 0;
        (data.flavors || []).forEach((f: any) => {
          sum += (f.quantity || 0) * salePrice;
        });
        if (type !== 'liquids' && !data.flavors) {
          sum += (data.quantity || 0) * salePrice;
        }
      });
    }
    return sum;
  };

  const handleSell = async () => {
    if (!cart.length || !paymentType) return alert('Оберіть товар та тип оплати');

    let cash = 0;
    let card = 0;
    if (paymentType === 'cash') cash = totalCartPrice;
    if (paymentType === 'card') card = totalCartPrice;
    if (paymentType === 'split') {
      cash = Number(splitPayment.cash);
      card = Number(splitPayment.card);
      if (cash + card !== totalCartPrice) return alert('Сума не співпадає з загальною');
    }

    setSelling(true);
    try {
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

        await updateDoc(docRef, { flavors: updatedFlavors });

        if (selectedType === 'liquids' && updatedFlavors.length === 0) {
          await updateDoc(docRef, { flavors: [] });
        }
      }

      setCart([]);
      setPaymentType('');
      setSplitPayment({ cash: '', card: '' });
      setSelectedBrand(null);
      setStep('type');

      await loadBrands(); // refresh data

      const remainingTotal = await getRemainingTotal();

      const logRef = doc(db, 'seller_logs', 'current');
      const logSnap = await getDoc(logRef);
      const existing = logSnap.exists() ? logSnap.data() : {
        total: 0,
        cash: 0,
        card: 0,
        salary: 0,
        mine: 0
      };

      const updated = {
        total: remainingTotal,
        cash: existing.cash + cash,
        card: existing.card + card,
        salary: existing.salary + sellerSalary,
        mine: existing.mine + myEarnings
      };

      await setDoc(logRef, updated);
      setLog(updated);
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {step === 'type' && (
        <div>
          <h2 className="text-lg font-semibold">Оберіть тип товару:</h2>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(type => (
              <button key={type} onClick={() => {
                setSelectedType(type);
                setStep('brand');
              }} className="bg-gray-200 px-4 py-2 rounded">
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
          {loadingBrands ? (
            <p className="text-gray-500 mt-4">Завантаження брендів...</p>
          ) : brands.filter(b => b.flavors?.length).length === 0 ? (
            <p className="text-gray-500 mt-4">Немає товарів для цього типу.</p>
          ) : (
            brands.filter(b => b.flavors?.length).map(b => (
              <button
                key={b.brand}
                onClick={() => { setSelectedBrand(b); setStep('flavor'); }}
                className="block bg-gray-100 p-2 mt-2 rounded text-left w-full"
              >
                {b.brand}
              </button>
            ))
          )}
        </div>
      )}

      {step === 'flavor' && selectedBrand && (
        <div>
          <button onClick={() => setStep('brand')} className="text-blue-600">← Назад</button>
          <h2 className="mt-4 font-semibold">Оберіть смак:</h2>
          {selectedBrand.flavors.length === 0 ? (
            <p className="text-gray-500">У цього бренду немає доступних смаків.</p>
          ) : (
            selectedBrand.flavors.map((fl: any, idx: number) => (
              <div key={idx} className="border p-2 rounded mt-2">
                <div><strong>{fl.name}</strong></div>
                <div>К-сть: {fl.quantity}</div>
                <div>Ціна продажу: {selectedBrand.salePrice} грн</div>
                <div>ЗП продавця: {selectedBrand.sellerAmount} грн</div>
                <button
                  disabled={fl.quantity < 1}
                  onClick={() => {
                    if (fl.quantity > 0) {
                      setCart([...cart, {
                        name: fl.name,
                        productId: selectedBrand.id,
                        salePrice: selectedBrand.salePrice,
                        sellerAmount: selectedBrand.sellerAmount
                      }]);
                    }
                  }}
                  className="mt-2 bg-green-500 text-white px-3 py-1 rounded disabled:opacity-50"
                >
                  Додати до кошика
                </button>
              </div>
            ))
          )}
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

            <button
              onClick={handleSell}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={selling}
            >
              {selling ? 'Обробка...' : 'Продано'}
            </button>

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
