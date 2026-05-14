/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: '#0d0f13',
          bg2: '#16181d',
          panel: '#1a1d23',
          surface: '#16181d',
          strong: '#1f2329',
          row: '#16181d',
          muted: '#1f2329',
          border: '#2a2e36',
          text: '#e8eaed',
          soft: '#7d8590',
          faint: '#4a5160',
          accent: '#3cff6b',
          green: '#3cff6b',
          blue: '#4dabf7',
          info: '#4dabf7',
          danger: '#ff4757',
          warning: '#ffb84d',
        },
      },
    },
  },
  plugins: [],
};
