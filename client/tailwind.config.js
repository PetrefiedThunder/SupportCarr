/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f7ff',
          500: '#2563eb',
          700: '#1e3a8a'
        }
      }
    }
  },
  plugins: []
};
