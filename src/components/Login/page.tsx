'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ADMIN_EMAILS = ['2103kokakola2004@gmail.com'];
const SELLER_EMAILS = ['2103kokakola2004@gmail.com', '123123@gmail.com'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = searchParams.get('role'); // "admin" або "seller"

  // Краще типізувати помилку як unknown, і кастити з перевірками
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (role === 'admin' && ADMIN_EMAILS.includes(user.email ?? '')) {
        router.push('/admin');
      } else if (role === 'seller' && SELLER_EMAILS.includes(user.email ?? '')) {
        router.push('/seller');
      } else {
        alert('⛔ У вас немає доступу до цієї панелі.');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert('❌ Помилка входу: ' + error.message);
      } else {
        alert('❌ Сталася невідома помилка');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black px-4">
      <div className="w-full max-w-sm bg-white border border-black p-6 rounded shadow-lg transition duration-300">
        <h2 className="text-2xl font-bold text-center mb-6">
          {role === 'admin'
            ? 'Вхід як Адміністратор'
            : role === 'seller'
              ? 'Вхід як Продавець'
              : 'Вхід'}
        </h2>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full mb-4 px-4 py-2 border border-black rounded focus:outline-none focus:ring-2 focus:ring-black transition"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          className="w-full mb-6 px-4 py-2 border border-black rounded focus:outline-none focus:ring-2 focus:ring-black transition"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-black text-white py-2 rounded hover:bg-white hover:text-black border border-black transition"
        >
          Увійти
        </button>
      </div>
    </div>
  );
}
