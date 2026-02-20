/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: '#D4DE47',
                'brand-hover': '#c3cf32',
            },
            fontFamily: {
                sans: ['"Mark Pro"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
