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
        canvas: '#f8f6f2',
        surface: '#ffffff',
        ink: '#1a1814',
        muted: '#6b665e',
        subtle: '#a39e96',
        line: '#ebe6de',
        'line-strong': '#ddd6cb',
        accent: '#8f7348',
        'accent-hover': '#75603a',
        'accent-muted': 'rgba(143, 115, 72, 0.1)',
        success: '#4a7c5c',
        danger: '#c45c5c',
      },
      boxShadow: {
        card: '0 1px 0 rgba(26, 24, 20, 0.04), 0 12px 40px rgba(26, 24, 20, 0.05)',
        lift: '0 8px 30px rgba(26, 24, 20, 0.1)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite linear',
        'fade-in': 'fadeIn 0.45s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
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
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
