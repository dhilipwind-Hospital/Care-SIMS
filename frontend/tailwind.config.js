/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F766E', light: '#14B8A6', dark: '#0D6B63' },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        sidebar: { DEFAULT: '#0C1B2A', border: '#1E3A5F', text: '#94A3B8', active: '#F1F5F9' },
        hms: { bg: '#F7F8FA', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      borderRadius: {
        'card': '16px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(52, 89, 154, 0.08)',
      },
    },
  },
  plugins: [],
}

