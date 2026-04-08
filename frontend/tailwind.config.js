/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--colors-primary)",
        secondary: "var(--colors-secondary)",
        accent: "var(--colors-accent)",
        neutral: "var(--colors-neutral)",
      },
      fontFamily: {
        heading: ["var(--typography-headingFont)"],
        body: ["var(--typography-bodyFont)"],
      },
      spacing: {
        base: "var(--spacing-base)",
      }
    },
  },
  plugins: [],
}
