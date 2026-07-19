/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F1E7",
        surface: "#FFFEFA",
        surface2: "#FBF5E8",
        ink: "#211D16",
        soft: "#6E6754",
        faint: "#A29A84",
        line: "#E6DECB",
        amber: "#B5651D",
        teal: "#2B6B54",
        rust: "#A13F28",
        plum: "#7C5285",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(110,103,84,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(110,103,84,0.09) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(33,29,22,0.04), 0 6px 20px -8px rgba(33,29,22,0.10)",
        lift: "0 2px 4px rgba(33,29,22,0.05), 0 16px 32px -12px rgba(33,29,22,0.16)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
