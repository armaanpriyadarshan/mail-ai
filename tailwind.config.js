/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Warm stationery palette. One confident accent.
        paper: "#FBF7F1",
        ink: "#1F1B16",
        muted: "#7A6F62",
        line: "#EAE2D3",
        card: "#FFFFFF",
        accent: "#E26A2C",
        accentSoft: "#FBE3D1",
        success: "#3C8C5C",
        danger: "#C8553D",
      },
      borderRadius: {
        card: "12px",
      },
      spacing: {
        card: "16px",
      },
      fontFamily: {
        // Provisional. Swap to a real Google Font (e.g. "Inter", "Fraunces") once chosen.
        sans: ["System"],
        serif: ["Georgia"],
      },
    },
  },
  plugins: [],
};
