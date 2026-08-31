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
        // Light mode colors (existing)
        light: {
          bg: '#f8f9fb',
          surface: '#ffffff',
          surfaceAlt: '#f7f7f8',
          border: '#e5e7eb',
          borderLight: '#f3f4f6',
          text: '#111827',
          textSecondary: '#6b7280',
          textTertiary: '#9ca3af',
          hover: '#f3f4f6',
          active: '#e5e7eb',
        },
        // Dark mode colors
        dark: {
          bg: '#050505',
          surface: '#0b0b0b',
          surfaceAlt: '#111111',
          border: '#262626',
          borderLight: '#1f1f1f',
          text: '#f5f5f5',
          textSecondary: '#a3a3a3',
          textTertiary: '#737373',
          hover: '#1a1a1a',
          active: '#1f1f1f',
        },
        // Brand colors (consistent across themes)
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      backgroundColor: {
        'surface': 'var(--bg-surface)',
        'surface-alt': 'var(--bg-surface-alt)',
        'background': 'var(--bg-background)',
      },
      textColor: {
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'tertiary': 'var(--text-tertiary)',
      },
      borderColor: {
        'default': 'var(--border-default)',
        'light': 'var(--border-light)',
      },
    },
  },
  plugins: [],
}
