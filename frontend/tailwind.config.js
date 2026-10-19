/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '400px',
      },
      spacing: {
        '0.2': '0.05rem',
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '13': '3.25rem',
        '13.5': '3.375rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '21': '5.25rem',
        '22': '5.5rem',
        '25': '6.25rem',
        '50': '12.5rem',
      },
      opacity: {
        '8': '0.08',
        '12': '0.12',
        '14': '0.14',
        '18': '0.18',
        '24': '0.24',
        '88': '0.88',
        '96': '0.96',
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#1b88ee',
          600: '#1575ce',
          700: '#1d4ed8',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}

