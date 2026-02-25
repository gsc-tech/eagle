/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            colors: {
                // Chart colors
                'chart-up': '#00C853',     // More vibrant green
                'chart-down': '#FF1744',   // More vibrant red
                'chart-primary': '#2962FF',

                // Market depth colors (refined)
                'bid': '#00BFA5', // Teal-ish green
                'ask': '#FF5252', // Soft red

                // UI colors (Premium palette)
                'border-light': 'rgba(0, 0, 0, 0.08)', // Very subtle border
                'bg-light': '#F5F7FB',
                'bg-card': '#FFFFFF',
                'text-primary': '#111827', // Cool gray 900
                'text-secondary': '#6B7280', // Cool gray 500
                'text-muted': '#9CA3AF', // Cool gray 400
                'glass-border': 'rgba(255, 255, 255, 0.2)',
            },
            fontFamily: {
                'mono': ['JetBrains Mono', 'Roboto Mono', 'monospace'], // JetBrains Mono is popular for finance
                'sans': ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'premium-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            },
            opacity: {
                '15': '0.15',
            }
        },
    },
    plugins: [],
};
