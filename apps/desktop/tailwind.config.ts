import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        gc: {
          black:    '#070709',
          surface1: '#0d0d14',
          surface2: '#12121c',
          surface3: '#181826',
          surface4: '#1e1e30',
          purple:   '#7c3aed',
          'purple-bright': '#a855f7',
          orange:   '#f97316',
          'orange-bright': '#fb923c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'broadcast': `
          radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(249,115,22,0.06) 0%, transparent 50%)
        `,
      },
      animation: {
        'live-pulse': 'live-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.85)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
