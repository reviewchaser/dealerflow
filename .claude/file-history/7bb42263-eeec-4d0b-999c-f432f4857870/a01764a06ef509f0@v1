/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand colors using CSS variables
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          light: 'hsl(var(--brand-light))',
          dark: 'hsl(var(--brand-dark))',
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          light: 'hsl(var(--accent-light))',
          50: 'hsl(var(--accent-50))',
        },
        // Semantic colors
        success: {
          DEFAULT: 'hsl(var(--success))',
          light: 'hsl(var(--success-light))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          light: 'hsl(var(--warning-light))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          light: 'hsl(var(--danger-light))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          light: 'hsl(var(--info-light))',
        },
        // Surface colors
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          2: 'hsl(var(--surface-2))',
          hover: 'hsl(var(--surface-hover))',
        },
        'page-bg': 'hsl(var(--bg))',
        // Text colors
        'text-primary': 'hsl(var(--text))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-muted': 'hsl(var(--text-muted))',
      },
      borderColor: {
        DEFAULT: 'hsl(var(--border))',
        light: 'hsl(var(--border-light))',
        focus: 'hsl(var(--border-focus))',
      },
      boxShadow: {
        'brand': 'var(--shadow-brand)',
        'card': 'var(--shadow-md)',
        'card-hover': 'var(--shadow-lg)',
      },
      borderRadius: {
        'card': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'var(--gradient-card)',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dealerflow: {
          "primary": "#0066CC",
          "primary-content": "#ffffff",
          "secondary": "#14B8A6",
          "secondary-content": "#ffffff",
          "accent": "#0EA5E9",
          "accent-content": "#ffffff",
          "neutral": "#1e293b",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#f1f5f9",
          "base-content": "#0f172a",
          "info": "#0EA5E9",
          "success": "#059669",
          "warning": "#F59E0B",
          "error": "#DC2626",
        },
      },
      "light",
      "dark",
    ],
    defaultTheme: "dealerflow",
  },
}
