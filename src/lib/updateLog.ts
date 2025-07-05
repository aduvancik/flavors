'use client';

import {
  doc,
  setDoc,
  getDocs,
  collection,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID!;

export async function sendTelegramMessage(text: string): Promise<void> {
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

const TYPE_OPTIONS = ['liquids', 'cartridges', 'nicoboosters'] as const;
type ProductType = typeof TYPE_OPTIONS[number];

interface Flavor {
  name: string;
  quantity: number;
}

interface ProductData {
  brand: string;
  salePrice: number;
  quantity?: number;
  flavors?: Flavor[];
  volume?: number;
}

interface SellerLogData {
  total?: number;
  cash?: number;
  card?: number;
  salary?: number;
  mine?: number;
  [key: string]: unknown;
}

export const getRemainingTotal = async (): Promise<number> => {
  let sum = 0;
  for (const type of TYPE_OPTIONS) {
    const snap = await getDocs(collection(db, type));
    snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data() as ProductData;
      const salePrice = data.salePrice ?? 0;
      (data.flavors ?? []).forEach((f: Flavor) => {
        sum += (f.quantity ?? 0) * salePrice;
      });
      if (type !== 'liquids' && !data.flavors) {
        sum += (data.quantity ?? 0) * salePrice;
      }
    });
  }
  return sum;
};

export async function sendReportAndAvailability(newData: SellerLogData, operation: string): Promise<void> {
  const snapshot = await getDocs(collection(db, 'liquids'));
  const flavors: string[] = [];
  const emptyFlavors: string[] = [];
  const emptyBrands: string[] = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data() as ProductData;
    const brand = data.brand;
    const activeFlavors = (data.flavors ?? []).filter(f => (f.quantity ?? 0) > 0);

    if (activeFlavors.length) {
      activeFlavors.forEach(f => {
        flavors.push(`${brand} - ${f.name}: ${f.quantity}шт`);
      });
    } else {
      emptyBrands.push(brand);
    }

    (data.flavors ?? []).forEach(f => {
      if ((f.quantity ?? 0) === 0) {
        emptyFlavors.push(`${brand} - ${f.name}`);
      }
    });
  });

  const total = await getRemainingTotal();

  const logRef = doc(db, 'seller_logs', 'current');
  await setDoc(logRef, { ...newData, total }, { merge: true });

  const cash = Number(newData.cash ?? 0);
  const card = Number(newData.card ?? 0);
  const salary = Number(newData.salary ?? 0);
  const mine = Number(newData.mine ?? 0);

  const reportMessage = `🧾 <b>- ${operation} -</b>

<b>Загальний товар (залишок):</b> ${total} шт
<b>Готівка:</b> ${cash} грн
<b>Карта:</b> ${card} грн
<b>Загальна сума:</b> ${cash + card} грн
<b>ЗП продавця:</b> ${salary} грн
<b>Моє:</b> ${mine} грн`;

  const flavorList = flavors.length
    ? `<b>📦 Актуальна наявність рідин:</b>\n` + flavors.join('\n')
    : `<b>УВАГА:</b> Усі рідини закінчились.`;

  // await sendTelegramMessage(reportMessage);
  // await sendTelegramMessage(flavorList);
  // якщо треба, раскоментуй відправку
}

export async function sendAvailabilityAndSellerLog(operation: string, newlyDepleted?: string[]): Promise<void> {
  const snapshot = await getDocs(collection(db, 'liquids'));
  const brandMap: Record<string, string[]> = {};

  snapshot.forEach(docSnap => {
    const data = docSnap.data() as ProductData;
    const brand = data.brand;
    const flavors = data.flavors ?? [];

    const activeFlavors = flavors.filter(f => (f.quantity ?? 0) > 0);

    if (!brandMap[brand]) brandMap[brand] = [];

    activeFlavors.forEach(f => {
      brandMap[brand].push(`${f.name}: ${f.quantity}шт`);
    });
  });

  let availabilityMessage = `<b>📦 Актуальна наявність рідин:</b>\n`;

  for (const brand in brandMap) {
    availabilityMessage += `${brand}\n`;
    brandMap[brand].forEach(flavorLine => {
      availabilityMessage += ` ${flavorLine}\n`;
    });
  }

  const logRef = doc(db, 'seller_logs', 'current');
  const logSnap = await getDoc(logRef);
  const logData = logSnap.exists() ? (logSnap.data() as SellerLogData) : {};

  const total = Number(logData.total ?? 0);
  const cash = Number(logData.cash ?? 0);
  const card = Number(logData.card ?? 0);
  const salary = Number(logData.salary ?? 0);
  const mine = Number(logData.mine ?? 0);

  const sellerLogMessage = `🧾 <b>${operation}</b>

<b>Загальний товар (залишок):</b> ${total} грн
<b>Готівка:</b> ${cash} грн
<b>Карта:</b> ${card} грн
<b>Загальна сума:</b> ${cash + card} грн
<b>ЗП продавця:</b> ${salary} грн
<b>Моє:</b> ${mine} грн`;

  await sendTelegramMessage(sellerLogMessage);
  await sendTelegramMessage(availabilityMessage);

  if (newlyDepleted?.length) {
    let depletedMessage = `⚠️ <b>Вичерпано під час продажу:</b>\n`;
    newlyDepleted.forEach(entry => {
      depletedMessage += `• ${entry}\n`;
    });
    await sendTelegramMessage(depletedMessage);
  }
}

export async function updateLog(newData: SellerLogData, operation: string): Promise<void> {
  const ref = doc(db, 'seller_logs', 'current');
  await setDoc(ref, newData);
  await sendReportAndAvailability(newData, operation);
}

export async function sendSaleSummaryMessage({
  cart,
  selectedType,
  paymentInfo,
}: {
  cart: { productId: string; name?: string }[];
  selectedType: ProductType;
  paymentInfo: { cash: number; card: number };
}): Promise<void> {
  const now = new Date();
  const timestamp = now.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  let message = `<b>${timestamp}</b>\nПродаж ${selectedType === 'liquids'
      ? 'рідини'
      : selectedType === 'cartridges'
        ? 'катриджа'
        : 'товару'
    }:\n`;

  const newlyDepleted: string[] = [];

  for (const item of cart) {
    const docRef = doc(db, selectedType, item.productId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) continue;
    const data = docSnap.data() as ProductData;

    if (selectedType === 'liquids') {
      const flavor = (data.flavors ?? []).find(f => f.name === item.name);
      if (flavor && flavor.quantity - 1 === 0) {
        const depletedId = `${selectedType}_${item.productId}_${flavor.name}`;
        const depletedRef = doc(db, 'depleted_flavors', depletedId);
        const depletedSnap = await getDoc(depletedRef);
        if (!depletedSnap.exists()) {
          newlyDepleted.push(`${data.brand} ${data.volume} ml ${flavor.name}`);
          await setDoc(depletedRef, { depletedAt: now });
        }
      }
      message += `${data.brand} ${data.volume} ml ${item.name}\n`;
    } else {
      if (typeof data.quantity === 'number' && data.quantity - 1 === 0) {
        const depletedId = `${selectedType}_${item.productId}_main`;
        const depletedRef = doc(db, 'depleted_flavors', depletedId);
        const depletedSnap = await getDoc(depletedRef);
        if (!depletedSnap.exists()) {
          newlyDepleted.push(`${data.brand} (основний товар)`);
          await setDoc(depletedRef, { depletedAt: now });
        }
      }
      message += `${data.brand}\n`;
    }
  }

  message += `\n${paymentInfo.card} грн карта\n${paymentInfo.cash} грн готівка\n`;

  const total = await getRemainingTotal();
  message += `\nАктуальна наявність: ${total} грн\n`;

  if (newlyDepleted.length) {
    message += `\n⚠️ <b>Вичерпано:</b>\n`;
    newlyDepleted.forEach(entry => {
      message += `• ${entry}\n`;
    });
  }

  await sendTelegramMessage(message);
}
