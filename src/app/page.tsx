// page.tsx
'use client'

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <button
        onClick={() => router.push('/login?role=seller')}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Увійти як продавець
      </button>

      <button
        onClick={() => router.push('/login?role=admin')}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Увійти як адміністратор
      </button>
    </div>
  );
}
