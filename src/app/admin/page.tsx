'use client'
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";

// Лише один дозволений email
const ADMIN_EMAIL = "2103kokakola2004@gmail.com";

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) return <p>Завантаження...</p>;

  // Перевірка доступу
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/login");
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">👑 Адмін панель</h1>
      <Link href="/admin/arrival" className="block bg-blue-600 text-white p-3 rounded">📦 Прихід</Link>
      <Link href="/admin/products" className="block bg-green-600 text-white p-3 rounded">🔍 Перевірка товарів</Link>
      <Link href="/admin/discard" className="block bg-red-600 text-white p-3 rounded">🗑️ Списати товар</Link>
    </div>
  );
}
