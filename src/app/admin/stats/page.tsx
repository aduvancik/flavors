'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type DailySale = {
  date: string;
  totalSum: number;
  profit: number;
  salesCount: number;
};

export default function AdminStatsPage() {
  const [data, setData] = useState<DailySale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const salesCol = collection(db, 'daily_sales');
      const snapshot = await getDocs(salesCol);
      const sales: DailySale[] = [];
      snapshot.forEach(doc => {
        const d = doc.data() as DailySale;
        sales.push(d);
      });
      sales.sort((a, b) => a.date.localeCompare(b.date));
      setData(sales);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <p>Завантаження...</p>;
  if (!data.length) return <p>Дані статистики відсутні.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <h1 className="text-3xl font-bold mb-4">📈 Статистика продажів</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Сума продажів за день (грн)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="totalSum" stroke="#8884d8" name="Сума продажів" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Прибуток за день (грн)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Прибуток" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Кількість продажів за день</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="salesCount" stroke="#ff7300" name="Продажі" />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
