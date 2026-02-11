/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./views/**/*.ejs", "./public/js/**/*.js"],
    theme: {
        extend: {
            colors: {
                satelink: {
                    base: '#f8fafc',    // Slate 50 (Light Background)
                    surface: '#ffffff', // White (Card Background)
                    accent: '#1a73e8',  // Google Blue
                    success: '#10b981', // Emerald 500
                    warning: '#f59e0b', // Amber 500
                    error: '#ef4444',   // Red 500
                    text: '#1e293b',    // Slate 800 (Dark Text)
                    muted: '#64748b',   // Slate 500 (Muted Text)
                    border: '#e2e8f0'   // Slate 200 (Borders)
                }
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'], // Ensure a clean font is used if available, else fallback
            }
        },
    },
    plugins: [],
}
