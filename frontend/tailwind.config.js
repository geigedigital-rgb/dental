/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff4fe',
          100: '#e0e9fd',
          200: '#c7d9fc',
          300: '#a4bff9',
          400: '#7a9cf5',
          500: '#3882EC',
          600: '#3882EC',
          700: '#2d6bd6',
          800: '#2557b8',
          900: '#1e4290',
        },
        app: {
          bg: '#EDF6FE',
          ink: '#191E21',
        },
        gray: {
          900: '#191E21',
        },
        border: '#e5e7eb',
        muted: '#6b7280',
        'muted-foreground': '#9ca3af',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@headlessui/tailwindcss')],
};
