'use client'

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 bg-white text-black px-4">
      <h1 className="text-2xl font-bold tracking-wide mb-6">Оберіть роль</h1>

      <button
        onClick={() => router.push('/login?role=seller')}
        className="w-full max-w-xs border border-black px-4 py-3 rounded-md hover:bg-black hover:text-white transition duration-300"
      >
        Увійти як продавець
      </button>

      <button
        onClick={() => router.push('/login?role=admin')}
        className="w-full max-w-xs border border-black px-4 py-3 rounded-md hover:bg-black hover:text-white transition duration-300"
      >
        Увійти як адміністратор
      </button>
    </div>
  );
}
