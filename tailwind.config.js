/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // From Figma design
        bg: '#F8F3E8',        // warm ivory cream
        sage: '#C8D49A',      // olive green
        primary: '#9B6035',   // chocolate brown
        accent: '#F0A060',    // warm orange
        footer: '#2A1A08',    // dark brown
        // Keep some existing
        cream: '#fefefe',
        brown: '#264653',
        yellow: '#E76F51',
        lightBg: '#faf8f5',
      },
    },
  },
  plugins: [],
}
