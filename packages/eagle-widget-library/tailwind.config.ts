import type { Config } from "tailwindcss"
import preset from "./tailwind.preset.js"

const config: Config = {
    darkMode: 'class',
    presets: [preset],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./test/**/*.{js,jsx,ts,tsx}",
    ],
    theme: { extend: {} },
    plugins: [],
}

export default config
