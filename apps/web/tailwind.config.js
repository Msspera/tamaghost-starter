
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        'glow': '0 0 60px rgba(255,255,255,0.4)'
      }
    },
  },
  plugins: [],
};
