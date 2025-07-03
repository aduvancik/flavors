'use client';

import { doc, setDoc, getDocs, collection, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const TELEGRAM_BOT_TOKEN = '7716741812:AAEF9h_3of02kJ6NsBxrRk0_2b3z7e58oHA';
const TELEGRAM_CHAT_ID = '-1002893695048';

export async function sendTelegramMessage(text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML'
    })
  });
}

const TYPE_OPTIONS = ['liquids', 'cartridges', 'nicoboosters'];


export const getRemainingTotal = async () => {
  let sum = 0;
  for (const type of TYPE_OPTIONS) {
    const snap = await getDocs(collection(db, type));
    snap.forEach(doc => {
      const data = doc.data();
      const salePrice = data.salePrice || 0;
      (data.flavors || []).forEach((f: any) => {
        sum += (f.quantity || 0) * salePrice;
      });
      if (type !== 'liquids' && !data.flavors) {
        sum += (data.quantity || 0) * salePrice;
      }
    });
  }
  return sum;
};


export async function sendReportAndAvailability(newData: any, operation: string) {
  const snapshot = await getDocs(collection(db, 'liquids'));
  const flavors: string[] = [];
  const emptyFlavors: string[] = [];
  const emptyBrands: string[] = [];

  snapshot.forEach(docSnap => {
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

  const total = await getRemainingTotal();

  // Записуємо новий total в seller_logs/current
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

  // const disappearanceList = [...emptyBrands.map(b => `Бренд зник: ${b}`), ...emptyFlavors.map(f => `Смак зник: ${f}`)].join('\n');

  // await sendTelegramMessage(reportMessage);
  // await sendTelegramMessage(flavorList);
  // if (disappearanceList) {
  //   await sendTelegramMessage(`❗ <b>Зміни в наявності:</b>\n${disappearanceList}`);
  // }
}

export async function sendAvailabilityAndSellerLog(operation: string) {
  const snapshot = await getDocs(collection(db, 'liquids'));

  // Згрупуємо рідини по бренду
  const brandMap: Record<string, string[]> = {};

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const brand = data.brand;
    const flavors = data.flavors || [];

    // Фільтруємо смаки з кількістю > 0
    const activeFlavors = flavors.filter((f: any) => (f.quantity ?? 0) > 0);

    if (!brandMap[brand]) brandMap[brand] = [];

    activeFlavors.forEach((f: any) => {
      // Формуємо рядок смаку без бренду
      brandMap[brand].push(`${f.name}: ${f.quantity}шт`);
    });
  });

  // Формуємо текст повідомлення
  let availabilityMessage = `<b>📦 Актуальна наявність рідин:</b>\n`;

  for (const brand in brandMap) {
    availabilityMessage += `${brand}\n`;
    brandMap[brand].forEach(flavorLine => {
      availabilityMessage += ` ${flavorLine}\n`;
    });
  }

  // Отримуємо seller_logs
  const logRef = doc(db, 'seller_logs', 'current');
  const logSnap = await getDoc(logRef);
  const logData = logSnap.exists() ? logSnap.data() : {};

  const total = Number(logData?.total ?? 0);
  const cash = Number(logData?.cash ?? 0);
  const card = Number(logData?.card ?? 0);
  const salary = Number(logData?.salary ?? 0);
  const mine = Number(logData?.mine ?? 0);

  const sellerLogMessage = `🧾 <b>${operation}</b>

<b>Загальний товар (залишок):</b> ${total} грн
<b>Готівка:</b> ${cash} грн
<b>Карта:</b> ${card} грн
<b>Загальна сума:</b> ${cash + card} грн
<b>ЗП продавця:</b> ${salary} грн
<b>Моє:</b> ${mine} грн`;

  await sendTelegramMessage(sellerLogMessage);
  await sendTelegramMessage(availabilityMessage);
}



export async function updateLog(newData: any, operation: string) {
  const ref = doc(db, 'seller_logs', 'current');
  await setDoc(ref, newData);
  await sendReportAndAvailability(newData, operation);
}
