/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Esta línea es la más importante
  ],
  theme: {
    extend: {
      animation: {
        'fade-in-scale': 'fade-in-scale 0.2s ease-out forwards',
      },
      keyframes: {
        'fade-in-scale': {
          'from': { transform: 'scale(0.95)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

