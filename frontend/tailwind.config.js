/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0B0B0C",
        surface: "#121214",
        surface2: "#18181A",
        surface3: "#1F1F22",
        ink: "#E4E4E7",
        soft: "#A1A1AA",
        faint: "#63636E",
        line: "rgba(255,255,255,0.06)",
        lineH: "rgba(255,255,255,0.12)",

        // Semantic — used sparingly
        failure: "#E5553B",
        info: "#3B82F6",
        success: "#22C55E",
        warn: "#F59E0B",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        title: ["20px", { lineHeight: "28px", letterSpacing: "-0.02em", fontWeight: "600" }],
        section: ["13px", { lineHeight: "20px", letterSpacing: "0.08em", fontWeight: "600" }],
        body: ["13.5px", { lineHeight: "22px", fontWeight: "400" }],
        meta: ["11px", { lineHeight: "16px", letterSpacing: "0.06em", fontWeight: "500" }],
        caption: ["10px", { lineHeight: "14px", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      boxShadow: {
        none: "none",
        soft: "0 1px 3px rgba(0,0,0,0.24)",
        lift: "0 8px 24px rgba(0,0,0,0.32)",
        focus: "0 0 0 2px rgba(255,255,255,0.08)",
      },
      animation: {
        "fade-in": "fadeIn 180ms ease-out",
        "slide-up": "slideUp 180ms ease-out",
        "slide-in-right": "slideInRight 200ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
