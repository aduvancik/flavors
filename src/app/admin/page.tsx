'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import { useLoading } from '@/context/LoadingContext';

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID!;


async function sendTelegramMessage(text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export default function AdminDashboard() {
  const [log, setLog] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [form, setForm] = useState({ total: '', cash: '', card: '', salary: '', mine: '' });
  const [amount, setAmount] = useState('');
  const router = useRouter();
  const { isLoading, setLoading } = useLoading();



  useEffect(() => {
    const fetch = async () => {
      setLoading(true); // start loading
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
      setLoading(false); // end loading
    };
    fetch();
  }, []);


  const sendReportAndAvailability = async (newData: any, operation: string) => {
    const snapshot = await getDocs(collection(db, 'liquids'));
    const flavors: string[] = [];
    const emptyFlavors: string[] = [];
    const emptyBrands: string[] = [];

    snapshot.forEach((docSnap) => {
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
      ? `<b>📦 Актуальна наявність рідин:</b>\n` + flavors.join('\n')
      : `<b>УВАГА:</b> Усі рідини закінчились.`;

    const disappearanceList = [...emptyBrands.map((b) => `Бренд зник: ${b}`), ...emptyFlavors.map((f) => `Смак зник: ${f}`)].join('\n');

    await sendTelegramMessage(reportMessage);
    await sendTelegramMessage(flavorList);
    if (disappearanceList) {
      await sendTelegramMessage(`❗ <b>Зміни в наявності:</b>\n${disappearanceList}`);
    }
  };

  const withLoader = async (key: string, fn: () => Promise<void>): Promise<void> => {
    setLoadingButton(key);
    try {
      await fn();
    } finally {
      setLoadingButton(null);
    }
  };

  const updateLog = async (newData: any, operation = 'Оновлення даних'): Promise<void> => {
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

  const confirmAndExecute = async (message: string, callback: () => Promise<void>): Promise<void> => {
    if (confirm(message)) {
      await callback();
    }
  };


  const handleSave = async (): Promise<void> => {
    await confirmAndExecute('Зберегти зміни?', async () => {
      await updateLog(
        {
          total: Number(form.total),
          cash: Number(form.cash),
          card: Number(form.card),
          salary: Number(form.salary),
          mine: Number(form.mine),
        },
        '✏️ Редагування даних',
      );
      toast.success('Дані оновлено');
      setEditMode(false);
    });
  };

  const handlePay = async (type: 'mine' | 'salary'): Promise<void> => {
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error('Некоректна сума');
      return;
    }
    await confirmAndExecute(`Видати ${num} грн ${type === 'mine' ? 'собі' : 'продавцю'}?`, async () => {
      const updated = { ...log, [type]: log[type] - num };
      await updateLog(updated, `💵 Видано ${num} грн ${type === 'mine' ? 'собі' : 'продавцю'}`);
      toast.success('ЗП видано');
      setAmount('');
    });
  };

  const handleCashChange = async (type: 'add' | 'remove', field: 'cash' | 'card'): Promise<void> => {
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error('Некоректна сума');
      return;
    }
    await confirmAndExecute(`${type === 'add' ? 'Додати' : 'Зняти'} ${num} грн ${field === 'cash' ? 'готівки' : 'карти'}?`, async () => {
      const updated = {
        ...log,
        [field]: type === 'add' ? log[field] + num : log[field] - num,
      };
      await updateLog(updated, `${type === 'add' ? '➕ Додано' : '➖ Знято'} ${num} грн ${field === 'cash' ? 'готівки' : 'карти'}`);
      toast.success('Оновлено');
      setAmount('');
    });
  };

  if (isLoading || !log) return <LoadingSpinner />;




  return (
    <>
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg space-y-6">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-4 border-b pb-2">📊 Адмін панель</h2>
        <nav className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              setLoading(true);
              router.push('/admin/arrival');
            }}
            className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-lg shadow"
          >
            📦 Прихід
          </button>
          <button
            onClick={() => {
              setLoading(true);
              router.push('/admin/products');
            }}
            className="bg-green-600 hover:bg-green-700 transition text-white px-5 py-3 rounded-lg shadow"
          >
            🔍 Перевірка товарів
          </button>

          <button
            onClick={() => {
              setLoading(true);
              router.push('/admin/discard');
            }}
            className="bg-red-600 hover:bg-red-700 transition text-white px-5 py-3 rounded-lg shadow"
          >
            🗑️ Списати товар
          </button>

          <button
            onClick={() => {
              setLoading(true);
              router.push('/admin/stats');
            }}
            className="bg-purple-700 hover:bg-purple-800 transition text-white px-5 py-3 rounded-lg shadow"
          >
            📈 Статистика
          </button>

        </nav>

        {editMode ? (
          <form className="space-y-4 bg-gray-50 p-4 rounded-md shadow-inner">
            {['total', 'cash', 'card', 'salary', 'mine'].map((key) => (
              <div key={key}>
                <label className="block mb-1 text-gray-700 capitalize font-semibold">{key}</label>
                <input
                  type="number"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={key}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
            ))}
            <button
              onClick={(e) => {
                e.preventDefault();
                withLoader('save', handleSave);
              }}
              disabled={loadingButton === 'save'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-md font-semibold transition"
            >
              {loadingButton === 'save' ? '💾 Збереження...' : '💾 Зберегти'}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-gray-700 text-lg font-medium">
            <div className="bg-gray-50 p-4 rounded shadow">{`Загальний товар (залишок): ${log.total} грн`}</div>
            <div className="bg-gray-50 p-4 rounded shadow">{`Готівка: ${log.cash} грн`}</div>
            <div className="bg-gray-50 p-4 rounded shadow">{`Карта: ${log.card} грн`}</div>
            <div className="bg-gray-50 p-4 rounded shadow">{`Загальна сума: ${log.cash + log.card} грн`}</div>
            <div className="bg-gray-50 p-4 rounded shadow">{`ЗП продавця: ${log.salary} грн`}</div>
            <div className="bg-gray-50 p-4 rounded shadow">{`Моє: ${log.mine} грн`}</div>
          </div>
        )}

        <button
          onClick={() => setEditMode(!editMode)}
          className="text-blue-600 hover:text-blue-800 font-semibold underline transition"
        >
          {editMode ? 'Скасувати редагування' : '✏️ Редагувати дані'}
        </button>

        <section className="border-t pt-6 space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">💸 Операції</h3>
          <input
            type="number"
            placeholder="Сума"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <button
              onClick={() => withLoader('mine', () => handlePay('mine'))}
              disabled={loadingButton === 'mine'}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded shadow transition font-semibold"
            >
              {loadingButton === 'mine' ? '⏳...' : 'Видати собі'}
            </button>
            <button
              onClick={() => withLoader('salary', () => handlePay('salary'))}
              disabled={loadingButton === 'salary'}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white py-2 rounded shadow transition font-semibold"
            >
              {loadingButton === 'salary' ? '⏳...' : 'Видати продавцю'}
            </button>
            <button
              onClick={() => withLoader('add-cash', () => handleCashChange('add', 'cash'))}
              disabled={loadingButton === 'add-cash'}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-2 rounded shadow transition font-semibold"
            >
              {loadingButton === 'add-cash' ? '⏳...' : 'Додати готівку'}
            </button>
            <button
              onClick={() => withLoader('remove-cash', () => handleCashChange('remove', 'cash'))}
              disabled={loadingButton === 'remove-cash'}
              className="bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white py-2 rounded shadow transition font-semibold"
            >
              {loadingButton === 'remove-cash' ? '⏳...' : 'Зняти готівку'}
            </button>
            <button
              onClick={() => withLoader('add-card', () => handleCashChange('add', 'card'))}
              disabled={loadingButton === 'add-card'}
              className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded shadow transition font-semibold"
            >
              {loadingButton === 'add-card' ? '⏳...' : 'Додати карту'}
            </button>
            <button
              onClick={() => withLoader('remove-card', () => handleCashChange('remove', 'card'))}
              disabled={loadingButton === 'remove-card'}
              className="bg-purple-800 hover:bg-purple-900 disabled:opacity-50 text-white py-2 rounded shadow transition font-semibold"
            >
              {loadingButton === 'remove-card' ? '⏳...' : 'Зняти карту'}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
