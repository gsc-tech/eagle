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

                // Brand teal — used across trader/limits widgets
                'petrol': '#00998b',
                'petrol-light': '#00b3a2',
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
            },
            animation: {
                'slide-in-right':  'slideInRight 0.16s cubic-bezier(.16,1,.3,1)',
                'popover-in':      'popoverIn 0.13s cubic-bezier(.16,1,.3,1)',
                'column-panel-in': 'columnPanelIn 0.13s cubic-bezier(.16,1,.3,1)',
                'widget-spin':     'widgetSpin 0.6s linear',
            },
            keyframes: {
                slideInRight: {
                    from: { opacity: '0', transform: 'translateX(12px)' },
                    to:   { opacity: '1', transform: 'none' },
                },
                popoverIn: {
                    from: { opacity: '0', transform: 'translateY(-5px) scale(0.97)' },
                    to:   { opacity: '1', transform: 'none' },
                },
                columnPanelIn: {
                    from: { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
                    to:   { opacity: '1', transform: 'none' },
                },
                widgetSpin: {
                    from: { transform: 'rotate(0deg)' },
                    to:   { transform: 'rotate(360deg)' },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
