module.exports = {
  content: [`./src/**/*.{html,ts}`],
  theme: {
    extend: {
      animation: {
        fadeInUp: 'fadeInUp 2s ease-in-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(50px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
