'use client';

export async function sendTelegramMessage(text: string): Promise<void> {
  await fetch('/api/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
