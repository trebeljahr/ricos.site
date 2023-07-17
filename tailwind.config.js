/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/flowbite-react/**/*.js",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        darkRed: "rgb(204, 9, 9)",
        red: "rgb(232, 83, 83)",
        lightRed: "rgb(242, 145, 145)",
        lightGreyBlue: "rgb(233, 241, 249)",
        ultraLightBlue: "rgb(184, 216, 249)",
        lightBlue: "rgb(153, 204, 255)",
        blue: "rgb(68, 160, 255)",
        darkBlue: "rgb(15, 76, 229)",
        successGreen: "rgb(31, 214, 85)",
      },
    },
  },
  plugins: [require("flowbite/plugin"), require("tailgrids/plugin")],
};
