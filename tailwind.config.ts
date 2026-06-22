import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mfp: {
          navy: '#1C2B4B',
          blue: '#2675C5',
          'blue-dark': '#1A5FA8',
          green: '#4CAF50',
          red: '#F44336',
          orange: '#FF9800',
          gray: '#F5F6F8',
          border: '#E0E3E9',
          text: '#2C3E50',
          muted: '#6B7A8D',
        },
      },
    },
  },
  plugins: [],
};

export default config;
