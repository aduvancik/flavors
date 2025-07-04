'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TELEGRAM_BOT_TOKEN = '7716741812:AAEF9h_3of02kJ6NsBxrRk0_2b3z7e58oHA';
const TELEGRAM_CHAT_ID = '-1002893695048';

async function sendTelegramMessage(text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML'
    })
  });
}

export default function AdminDashboard() {
  const [log, setLog] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ total: '', cash: '', card: '', salary: '', mine: '' });
  const [amount, setAmount] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetch = async () => {
      const ref = doc(db, 'seller_logs', 'current');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setLog(data);
        setForm({
          total: String(data.total ?? 0),
          cash: String(data.cash ?? 0),
          card: String(data.card ?? 0),
          salary: String(data.salary ?? 0),
          mine: String(data.mine ?? 0),
        });
      } else {
        // Створити новий документ, якщо він відсутній
        const emptyData = { total: 0, cash: 0, card: 0, salary: 0, mine: 0 };
        await setDoc(ref, emptyData);
        setLog(emptyData);
        setForm({
          total: '0',
          cash: '0',
          card: '0',
          salary: '0',
          mine: '0',
        });
      }
    };
    fetch();
  }, []);


  const sendReportAndAvailability = async (newData: any, operation: string) => {
    const snapshot = await getDocs(collection(db, 'liquids'));
    const flavors: string[] = [];
    const emptyFlavors: string[] = [];
    const emptyBrands: string[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const brand = data.brand;
      const activeFlavors = (data.flavors || []).filter((f: any) => (f.quantity ?? 0) > 0);
      if (activeFlavors.length) {
        activeFlavors.forEach((f: any) => {
          flavors.push(`${brand} - ${f.name}: ${f.quantity}шт`);
        });
      } else {
        emptyBrands.push(brand);
      }
      (data.flavors || []).forEach((f: any) => {
        if ((f.quantity ?? 0) === 0) {
          emptyFlavors.push(`${brand} - ${f.name}`);
        }
      });
    });

    const reportMessage = `🧾 <b>${operation}</b>

<b>Загальний товар (залишок):</b> ${newData.total} грн
<b>Готівка:</b> ${newData.cash} грн
<b>Карта:</b> ${newData.card} грн
<b>Загальна сума:</b> ${newData.cash + newData.card} грн
<b>ЗП продавця:</b> ${newData.salary} грн
<b>Моє:</b> ${newData.mine} грн`;

    const flavorList = flavors.length
      ? `<b>📦 Актуальна наявність рідин:</b>
` + flavors.join('\n')
      : `<b>УВАГА:</b> Усі рідини закінчились.`;

    const disappearanceList = [...emptyBrands.map(b => `Бренд зник: ${b}`), ...emptyFlavors.map(f => `Смак зник: ${f}`)].join('\n');

    await sendTelegramMessage(reportMessage);
    await sendTelegramMessage(flavorList);
    if (disappearanceList) {
      await sendTelegramMessage(`❗ <b>Зміни в наявності:</b>\n${disappearanceList}`);
    }
  };




  const updateLog = async (newData: any, operation = 'Оновлення даних') => {
    const ref = doc(db, 'seller_logs', 'current');
    await setDoc(ref, newData);
    setLog(newData);
    setForm({
      total: String(newData.total ?? 0),
      cash: String(newData.cash ?? 0),
      card: String(newData.card ?? 0),
      salary: String(newData.salary ?? 0),
      mine: String(newData.mine ?? 0),
    });
    await sendReportAndAvailability(newData, operation);
  };

  const confirmAndExecute = (message: string, callback: () => void) => {
    if (confirm(message)) {
      callback();
    }
  };

  const handleSave = () => {
    confirmAndExecute('Зберегти зміни?', async () => {
      await updateLog({
        total: Number(form.total),
        cash: Number(form.cash),
        card: Number(form.card),
        salary: Number(form.salary),
        mine: Number(form.mine)
      }, '✏️ Редагування даних');
      toast.success('Дані оновлено');
      setEditMode(false);
    });
  };

  const handlePay = (type: 'mine' | 'salary') => {
    const num = Number(amount);
    if (!num || num <= 0) return toast.error('Некоректна сума');
    confirmAndExecute(`Видати ${num} грн ${type === 'mine' ? 'собі' : 'продавцю'}?`, async () => {
      const updated = { ...log, [type]: log[type] - num };
      await updateLog(updated, `💵 Видано ${num} грн ${type === 'mine' ? 'собі' : 'продавцю'}`);
      toast.success('ЗП видано');
      setAmount('');
    });
  };

  const handleCashChange = (type: 'add' | 'remove', field: 'cash' | 'card') => {
    const num = Number(amount);
    if (!num || num <= 0) return toast.error('Некоректна сума');
    confirmAndExecute(`${type === 'add' ? 'Додати' : 'Зняти'} ${num} грн ${field === 'cash' ? 'готівки' : 'карти'}?`, async () => {
      const updated = {
        ...log,
        [field]: type === 'add' ? log[field] + num : log[field] - num
      };
      await updateLog(updated, `${type === 'add' ? '➕ Додано' : '➖ Знято'} ${num} грн ${field === 'cash' ? 'готівки' : 'карти'}`);
      toast.success('Оновлено');
      setAmount('');
    });
  };

  if (!log) return <p>Завантаження...</p>;

  return (
    <div className="space-y-4 max-w-xl mx-auto p-4">
      <h2 className="text-2xl font-bold">📊 Адмін панель</h2>

      <div className="flex gap-2 flex-wrap">
        <Link href="/admin/arrival" className="bg-blue-600 text-white px-4 py-2 rounded">📦 Прихід</Link>
        <Link href="/admin/products" className="bg-green-600 text-white px-4 py-2 rounded">🔍 Перевірка товарів</Link>
        <Link href="/admin/discard" className="bg-red-600 text-white px-4 py-2 rounded">🗑️ Списати товар</Link>
        <button onClick={() => router.push('/admin/stats')} className="bg-purple-700 text-white px-4 py-2 rounded">📈 Статистика</button>
      </div>

      {editMode ? (
        <div className="space-y-2">
          {['total', 'cash', 'card', 'salary', 'mine'].map((key) => (
            <input
              key={key}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={key}
              className="border p-2 w-full"
            />
          ))}
          <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-4 rounded">💾 Зберегти</button>
        </div>
      ) : (
        <div className="space-y-1">
          <p>Загальний товар (залишок): {log.total} грн</p>
          <p>Готівка: {log.cash} грн</p>
          <p>Карта: {log.card} грн</p>
          <p>Загальна сума: {log.cash + log.card} грн</p>
          <p>ЗП продавця: {log.salary} грн</p>
          <p>Моє: {log.mine} грн</p>
        </div>
      )}

      <button onClick={() => setEditMode(!editMode)} className="text-blue-600 underline">
        {editMode ? 'Скасувати редагування' : '✏️ Редагувати дані'}
      </button>

      <div className="border-t pt-4 mt-4 space-y-2">
        <h3 className="font-semibold">💸 Операції</h3>
        <input
          type="number"
          placeholder="Сума"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border p-2 w-full"
        />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handlePay('mine')} className="bg-green-600 text-white py-2 px-4 rounded">Видати собі</button>
          <button onClick={() => handlePay('salary')} className="bg-yellow-600 text-white py-2 px-4 rounded">Видати продавцю</button>
          <button onClick={() => handleCashChange('add', 'cash')} className="bg-blue-500 text-white py-2 px-4 rounded">Додати готівку</button>
          <button onClick={() => handleCashChange('remove', 'cash')} className="bg-blue-800 text-white py-2 px-4 rounded">Зняти готівку</button>
          <button onClick={() => handleCashChange('add', 'card')} className="bg-purple-500 text-white py-2 px-4 rounded">Додати карту</button>
          <button onClick={() => handleCashChange('remove', 'card')} className="bg-purple-800 text-white py-2 px-4 rounded">Зняти карту</button>
        </div>
      </div>
    </div>
  );
}
