/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The deep navy/black palette from your reference image
        navy: {
          900: '#0a0c18', // Main background
          800: '#0d1120', // Sidebar and card background
          700: '#161b33', // Borders and hover states
        }
      },
      keyframes: {
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        }
      },
      animation: {
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
}