/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      colors: {
        canvas: '#f5f3ef',
        surface: '#ffffff',
        ink: '#141310',
        muted: '#6f6a63',
        subtle: '#9c958c',
        line: '#e6e1d9',
        'line-strong': '#d4cdc2',
        accent: '#9a7b4f',
        'accent-hover': '#7d6340',
        'accent-muted': 'rgba(154, 123, 79, 0.12)',
        success: '#3d6b52',
        danger: '#b54a4a',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 19, 16, 0.04), 0 8px 24px rgba(20, 19, 16, 0.06)',
        lift: '0 4px 20px rgba(20, 19, 16, 0.08)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
