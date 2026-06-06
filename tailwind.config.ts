import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50:  '#f0fdf8',
          100: '#d9faf0',
          200: '#b3f4e2',
          300: '#7eeacf',
          400: '#45d6b5',
          500: '#1fbf9d',
          600: '#139b81',
          700: '#127c69',
          800: '#136355',
          900: '#145247',
          950: '#062f29',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Noto Sans Thai', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
