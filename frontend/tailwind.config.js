/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#1a202c',
          950: '#0f1419',
        }
      }
    },
  },
  plugins: [],
}