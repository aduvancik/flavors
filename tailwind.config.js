/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        hamster: {
          '0%, 100%': { transform: 'rotate(4deg) translate(-0.8em,1.85em)' },
          '50%': { transform: 'rotate(0) translate(-0.8em,1.85em)' },
        },
        spoke: {
          '0%': { transform: 'rotate(0)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
      },
      animation: {
        hamster: 'hamster 1s ease-in-out infinite',
        spoke: 'spoke 1s linear infinite',
      },
    },
  },
  plugins: [],
};
