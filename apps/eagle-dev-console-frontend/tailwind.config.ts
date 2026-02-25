import type { Config } from "tailwindcss"
import preset from "@gsc-tech/eagle-widget-library/tailwind.preset.js"

const config: Config = {
    presets: [preset],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./node_modules/@gsc-tech/eagle-widget-library/dist/**/*.{js,jsx,ts,tsx}",
    ],
    theme: { extend: {} },
    plugins: [],
}

export default config
