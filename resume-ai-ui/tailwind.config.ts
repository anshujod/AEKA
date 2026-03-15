import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
    "./app/**/*.{ts,tsx,js,jsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: "#0f172a"
      }
    }
  },
  plugins: []
};

export default config;
