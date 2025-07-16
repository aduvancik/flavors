<h1 align="center">🧃 Vape Inventory & Sales System</h1>

<p align="center">
  Повноцінна система обліку продажів рідин, картриджів і нікобустерів з Firebase, React, TypeScript та Telegram інтеграцією.
</p>

<h2>🚀 Demo</h2>

[Перейти на сайт](https://vape-shopchik-ad.netlify.app/)

---

<h2>📸 Screenshots</h2>

![screenshot](https://github.com/aduvancik/aduvancik/blob/main/flavors-video.mp4)

---

## 📦 Про проєкт

Цей додаток дозволяє:
- Вести облік товару: рідини, картриджі, нікобустери
- Вказувати бренд, смаки, кількість, ціну, зарплату продавця
- Продавати товари через зручну панель
- Вибирати спосіб оплати: готівка, картка або поділ
- Автоматично формувати звіти та відправляти їх у Telegram
- Оновлювати залишки товару та відслідковувати, що закінчилось

---

## ⚙️ Функції

- ✅ Панель продавця
- ✅ Облік залишків у Firebase
- ✅ Статистика по днях (Daily Sales)
- ✅ Визначення "вичерпано" зі збереженням у окрему колекцію
- ✅ Повідомлення в Telegram з:
  - Загальним звітом
  - Залишками по брендах і смаках
  - Попередженням про вичерпання товару

---

Ось **повністю оформлений пункт `🛠️ Installation` для README.md** у вигляді markdown-коду з детальними інструкціями, включаючи підключення Firebase і Telegram:

```md
## 🛠️ Installation & Setup

> A step-by-step guide to launch your own vape seller platform with Firebase and Telegram integration.

---

### 1. 🔁 Clone the repository

```bash
git clone https://github.com/your-username/vape-seller-panel.git
cd vape-seller-panel
```

---

### 2. 📦 Install dependencies

```bash
npm install
```

---

### 3. 🔥 Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g., `vape-seller`)
3. Enable **Cloud Firestore** in test mode
4. Go to **Project settings** → **General** tab → scroll to **Your apps**
5. Click `</>` to create a Web App
6. Copy your Firebase config and replace `/lib/firebase.ts` with:

```ts
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_APP.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_APP.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

---

### 4. 💬 Connect Telegram Bot

> Used to send sales logs and product availability directly to Telegram.

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Run `/newbot` and follow the instructions
3. Copy the `BOT_TOKEN`
4. Create a Telegram group and add your bot to it as an **admin**
5. Send a message to the group, then go to [https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates](https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates)
6. Find your group `chat_id` (it starts with `-100`)
7. Create `/app/utils/sendTelegramMessage.ts` and paste:

```ts
// app/utils/sendTelegramMessage.ts
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = 'YOUR_BOT_TOKEN';
  const chatId = 'YOUR_CHAT_ID';
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}
```

✅ Test it by running:

```ts
sendTelegramMessage("✅ Bot is connected and ready!");
```

---

### 5. 🧪 Run the project in development mode

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

### 6. 🏗️ Build for production

```bash
npm run build
```

Optional: Preview production build locally

```bash
npm run start
```

---

> Now you're ready to manage vape liquid sales, track inventory, and send logs to Telegram 🚀
```

Якщо хочеш — можу згенерувати повний `README.md` з усіма секціями: опис, демо, скріншоти, інсталяція, стек технологій, автор, ліцензія.
