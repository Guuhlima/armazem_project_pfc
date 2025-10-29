/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
        keyframes: {
          'pan-grid': {
            '0%': { backgroundPosition: '0% 0%' },
            '100%': { backgroundPosition: '40px 40px' },
          },
          'pan-wireframe': {
            '0%': { backgroundPosition: '0 0' },
            '100%': { backgroundPosition: '60px 0' }, 
          },
          'starfield': {
            '0%': { backgroundPosition: '0 0' },
            '100%': { backgroundPosition: '-1000px -1000px' },
          },
        },
        animation: {
          'pan-grid': 'pan-grid 3s linear infinite',
          'pan-wireframe': 'pan-wireframe 15s linear infinite',
          'starfield': 'starfield 120s linear infinite', 
        },
        borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)'
        },
        colors: {
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            card: {
                DEFAULT: 'hsl(var(--card))',
                foreground: 'hsl(var(--card-foreground))'
            },
            popover: {
                DEFAULT: 'hsl(var(--popover))',
                foreground: 'hsl(var(--popover-foreground))'
            },
            primary: {
                DEFAULT: 'hsl(var(--primary))',
                foreground: 'hsl(var(--primary-foreground))'
            },
            secondary: {
                DEFAULT: 'hsl(var(--secondary))',
                foreground: 'hsl(var(--secondary-foreground))'
            },
            muted: {
                DEFAULT: 'hsl(var(--muted))',
                foreground: 'hsl(var(--muted-foreground))'
            },
            accent: {
                DEFAULT: 'hsl(var(--accent))',
                foreground: 'hsl(var(--accent-foreground))'
            },
            destructive: {
                DEFAULT: 'hsl(var(--destructive))',
                foreground: 'hsl(var(--destructive-foreground))'
            },
            border: 'hsl(var(--border))',
            input: 'hsl(var(--input))',
            ring: 'hsl(var(--ring))',
            chart: {
                '1': 'hsl(var(--chart-1))',
                '2': 'hsl(var(--chart-2))',
                '3': 'hsl(var(--chart-3))',
                '4': 'hsl(var(--chart-4))',
                '5': 'hsl(var(--chart-5))'
            }
        }
    }
  },
  plugins: [require("tailwindcss-animate")],
};