/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F8F9F7',
        surface: '#FFFFFF',
        'surface-subtle': '#F3F4F6',
        border: '#E5E7EB',
        'border-strong': '#D1D5DB',
        text: {
          DEFAULT: '#171717',
          muted: '#6B7280',
          light: '#9CA3AF',
        },
        primary: {
          DEFAULT: '#58CC02',
          hover: '#46A302',
          light: '#EAF8DF',
          dark: '#2F6E00',
          // Button fills: white text needs >= 4.5:1, which brand #58CC02 (2.2:1) cannot give.
          solid: '#3A8200',
          'solid-hover': '#2F6E00',
        },
        snapy: {
          DEFAULT: '#FF8A00',
          hover: '#E07A00',
          light: '#FFF3E6',
        },
        reward: {
          DEFAULT: '#FFC42E',
          hover: '#E0AB26',
          light: '#FFF9E6',
          dark: '#8A6100',
        },
        info: {
          DEFAULT: '#1CB0F6',
          hover: '#1899D6',
          light: '#E8F7FE',
          dark: '#0B6E99',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          light: '#FEE2E2',
          dark: '#B91C1C',
          solid: '#DC2626',
          'solid-hover': '#B91C1C',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FFF7E6',
          dark: '#8A4B00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
