/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Moodboard palette: warm paper, muted ink, dusty rose + sage accents,
      // gold/petal highlights. Kept desaturated on purpose — nothing pure white/black.
      colors: {
        paper:   { DEFAULT: '#F3F0EA', dark: '#1B211F' },
        surface: { DEFAULT: '#FBFAF6', dark: '#232B28' },
        ink:     { DEFAULT: '#2E3A3D', dark: '#E7E9E2' },
        ink2:    { DEFAULT: '#6B7572', dark: '#9AA6A0' },
        line:    { DEFAULT: '#DDD7C8', dark: '#3A4542' },
        rose:    { DEFAULT: '#B4676B', dark: '#D98B8E' },
        sage:    { DEFAULT: '#7C9082', dark: '#8FB39A' },
        gold:    { DEFAULT: '#C9A227', dark: '#E3C15A' },
        good:    { DEFAULT: '#5C7A5E', bg: '#E3E9DE', dark: '#8FCB9B', bgdark: '#213028' },
        edge:    { DEFAULT: '#A67C2E', bg: '#F1E6C8', dark: '#E3C15A', bgdark: '#3A2F10' },
        bad:     { DEFAULT: '#A6494D', bg: '#F3E0DF', dark: '#E38E92', bgdark: '#3E1A22' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
