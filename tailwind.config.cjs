/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        sm: '1.75rem',
        lg: '2rem'
      },
      screens: {
        '2xl': '1200px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace']
      },
      colors: {
        surface: {
          950: '#05070d',
          900: '#0b1120',
          800: '#11182a'
        }
      },
      borderRadius: {
        '3xl': '1.5rem'
      },
      animation: {
        ping: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
      }
    }
  },
  plugins: []
};
