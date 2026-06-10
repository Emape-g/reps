/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:           'rgb(var(--color-bg) / <alpha-value>)',
        surface:      'rgb(var(--color-surface) / <alpha-value>)',
        'surface-hi': 'rgb(var(--color-surface-hi) / <alpha-value>)',
        border:       'rgb(var(--color-border) / <alpha-value>)',
        text:         'rgb(var(--color-text) / <alpha-value>)',
        muted:        'rgb(var(--color-text-muted) / <alpha-value>)',
        primary:      'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hi': 'rgb(var(--color-primary-hi) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        success:      'rgb(var(--color-success) / <alpha-value>)',
        danger:       'rgb(var(--color-danger) / <alpha-value>)',
        warning:      'rgb(var(--color-warning) / <alpha-value>)',
      },
      fontFamily: {
        sans:    ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk Variable', 'Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
}
