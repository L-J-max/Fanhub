import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Rose primary — used for likes / active states (per FanHub design system)
        brand: {
          DEFAULT: '#E11D48',
          dark: '#BE123C',
          light: '#FB7185',
        },
        // Engagement blue — CTAs / primary actions
        accent: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#60A5FA',
        },
        ink: {
          DEFAULT: '#0f172a',
          muted: '#475569',
          subtle: '#94a3b8',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
        'card-hover': '0 8px 24px rgba(15,23,42,0.12)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'like-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'hero-rise': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'like-pop': 'like-pop 0.32s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'hero-rise': 'hero-rise 0.5s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
