'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ADMIN_EMAILS = ['2103kokakola2004@gmail.com'];
const SELLER_EMAILS = ['2103kokakola2004@gmail.com', 'seller@gmail.com'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = searchParams.get('role'); // "admin" або "seller"

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (role === 'admin' && ADMIN_EMAILS.includes(user.email || '')) {
        router.push('/admin');
      } else if (role === 'seller' && SELLER_EMAILS.includes(user.email || '')) {
        router.push('/seller');
      } else {
        alert('⛔ У вас немає доступу до цієї панелі.');
      }
    } catch (error: any) {
      alert('❌ Помилка входу: ' + error.message);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4 max-w-sm mx-auto">
      <h2 className="text-xl font-bold text-center">
        {role === 'admin' ? 'Вхід як Адміністратор' : role === 'seller' ? 'Вхід як Продавець' : 'Вхід'}
      </h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="border p-2"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
        className="border p-2"
      />
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white py-2 px-4 rounded"
      >
        Увійти
      </button>
    </div>
  );
}
