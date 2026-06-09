/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        fca: {
          black: '#08080a',
          dark: '#0e0e11',
          surface: '#141418',
          card: '#17171c',
          gray: '#1c1c22',
          border: '#26262e',
          muted: '#33333d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'fca-grid': `
          linear-gradient(rgba(250, 204, 21, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(250, 204, 21, 0.05) 1px, transparent 1px)
        `,
        'gold-gradient': 'linear-gradient(135deg, #fde047 0%, #facc15 45%, #ca8a04 100%)',
        'gold-text': 'linear-gradient(180deg, #fef08a 0%, #facc15 60%, #eab308 100%)',
        'surface-gradient': 'linear-gradient(160deg, #1a1a20 0%, #121216 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #101013 0%, #08080a 100%)',
      },
      backgroundSize: {
        grid: '46px 46px',
      },
      boxShadow: {
        gold: '0 8px 30px -8px rgba(250, 204, 21, 0.45)',
        'gold-sm': '0 4px 14px -4px rgba(250, 204, 21, 0.4)',
        card: '0 10px 40px -12px rgba(0, 0, 0, 0.7)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        glow: 'glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
