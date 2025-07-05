'use client';

import { useLoading } from '@/context/LoadingContext';


export default function LoadingSpinner() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="h-12 w-12 border-4 border-t-white border-white/30 rounded-full animate-spin" />
    </div>
  );
}
