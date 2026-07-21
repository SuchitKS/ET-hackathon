/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Industrial Slate Theme
        paper: "#020617",     // slate-950
        surface: "#090E17",   // deeper than slate-900
        surface2: "#0F172A",  // slate-900
        surface3: "#1E293B",  // slate-800
        ink: "#F8FAFC",       // slate-50
        soft: "#CBD5E1",      // slate-300
        faint: "#64748B",     // slate-500
        line: "rgba(148, 163, 184, 0.1)",
        lineH: "rgba(148, 163, 184, 0.2)",

        // Vibrant Semantic Colors
        failure: "#F43F5E",   // rose-500
        info: "#0EA5E9",      // sky-500
        success: "#10B981",   // emerald-500
        warn: "#F59E0B",      // amber-500
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
        lift: "0 10px 30px -10px rgba(0,0,0,0.5)",
        focus: "0 0 0 2px rgba(14, 165, 233, 0.25)", // Sky glow
        glow: "0 0 20px -5px var(--tw-shadow-color)",
      },
      animation: {
        "fade-in": "fadeIn 180ms ease-out",
        "slide-up": "slideUp 180ms ease-out",
        "slide-in-right": "slideInRight 200ms ease-out",
        "pulse-glow": "pulseGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
