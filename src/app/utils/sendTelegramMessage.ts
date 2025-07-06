'use client';

import { cleanUnavailableProducts } from "./cleanUnavailableLiquids";


export async function sendTelegramMessage(text: string): Promise<void> {
  await cleanUnavailableProducts();
  await fetch('/api/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

}
