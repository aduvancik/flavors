'use client';

import dynamic from 'next/dynamic';

// Динамічно імпортуємо LoginPage без SSR
const LoginPage = dynamic(() => import('@/components/Login/page'), {
  ssr: false,
});

export default function Login() {
  return <LoginPage />;
}
