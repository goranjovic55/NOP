/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk color palette
        cyber: {
          black: '#0a0a0a',
          dark: '#111111',
          darker: '#1a1a1a',
          gray: '#2a2a2a',
          'gray-light': '#3a3a3a',
          red: '#ff0040',
          'red-dark': '#cc0033',
          purple: '#8b5cf6',
          'purple-dark': '#7c3aed',
          'purple-light': '#a78bfa',
          green: '#00ff88',
          'green-dark': '#00cc6a',
          blue: '#00d4ff',
          'blue-dark': '#00a8cc',
          yellow: '#ffff00',
          'yellow-dark': '#cccc00',
        },
        slate: {
          850: '#1a202c',
          950: '#0f1419',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
        'terminal': ['Source Code Pro', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.2' }],    /* 11.25px - labels */
        'sm': ['0.875rem', { lineHeight: '1.4' }],   /* 13.125px - secondary text */
        'base': ['1rem', { lineHeight: '1.5' }],     /* 15px - default */
        'lg': ['1.125rem', { lineHeight: '1.5' }],   /* 16.875px - emphasis */
        'xl': ['1.25rem', { lineHeight: '1.4' }],    /* 18.75px - headings */
        '2xl': ['1.5rem', { lineHeight: '1.3' }],    /* 22.5px - large headings */
        '3xl': ['1.875rem', { lineHeight: '1.25' }], /* 28.125px - page titles */
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
      },
      boxShadow: {
        'cyber': '0 0 10px rgba(255, 0, 64, 0.3)',
        'cyber-purple': '0 0 10px rgba(139, 92, 246, 0.3)',
        'cyber-green': '0 0 10px rgba(0, 255, 136, 0.3)',
        'cyber-blue': '0 0 10px rgba(0, 212, 255, 0.3)',
      },
      animation: {
        'pulse-cyber': 'pulse-cyber 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        'pulse-cyber': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 5px rgba(255, 0, 64, 0.5)',
          },
          '50%': {
            opacity: '.8',
            boxShadow: '0 0 20px rgba(255, 0, 64, 0.8)',
          },
        },
        'glow': {
          'from': {
            textShadow: '0 0 5px rgba(255, 0, 64, 0.5)',
          },
          'to': {
            textShadow: '0 0 20px rgba(255, 0, 64, 0.8), 0 0 30px rgba(255, 0, 64, 0.6)',
          },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}