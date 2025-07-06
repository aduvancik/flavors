// app/api/telegram/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, chat_id } = await req.json();

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  console.log(TELEGRAM_BOT_TOKEN);

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return NextResponse.json({ error: 'Missing token or chat_id' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: result }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
