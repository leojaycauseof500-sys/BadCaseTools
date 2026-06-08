/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8f9fa',
          tertiary: '#f1f3f4',
        },
        border: {
          DEFAULT: '#dadce0',
        },
      },
      fontFamily: {
        sans: [
          '"Google Sans"',
          'Roboto',
          '"Segoe UI"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          '"Google Sans Mono"',
          '"Fira Code"',
          'Menlo',
          'Monaco',
          'monospace',
        ],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
