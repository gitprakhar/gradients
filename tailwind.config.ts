import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['EB Garamond', 'serif'],
        sans: ['Figtree', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
