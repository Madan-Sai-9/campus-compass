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
        bg: {
          primary: 'var(--bg-primary, #0B0D12)',
          secondary: 'var(--bg-secondary, #131722)',
          card: 'var(--bg-card, #171C28)',
          elevated: 'var(--bg-elevated, #1A1F2E)',
        },
        border: {
          color: 'var(--border-color, #262E3F)',
          hover: 'var(--border-hover, #3E4A68)',
        },
        text: {
          primary: 'var(--text-primary, #F3F4F6)',
          secondary: 'var(--text-secondary, #9CA3AF)',
          muted: 'var(--text-muted, #6B7280)',
        },
        accent: {
          primary: 'var(--accent-primary, #7C3AED)',
          hover: 'var(--accent-hover, #9061F9)',
        },
        success: 'var(--color-success, #22C55E)',
        warning: 'var(--color-warning, #F59E0B)',
        danger: 'var(--color-danger, #EF4444)',
        info: 'var(--color-info, #3B82F6)',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
      transitionDuration: {
        fast: '150ms',
        med: '250ms',
        slow: '300ms',
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 58, 237, 0.15)',
        'glow-lg': '0 0 30px rgba(124, 58, 237, 0.25)',
      }
    },
  },
  plugins: [],
}
