import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#226355",
          dark: "#1d3a2f",
          light: "#e6f0ec",
        },
        accent: {
          DEFAULT: "#a94e24",
          light: "#f6e8df",
        },
        cream: "#f5efe3",
        ink: "#1c2420",
      },
    },
  },
  plugins: [],
};

export default config;
