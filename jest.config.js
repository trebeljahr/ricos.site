// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: __dirname,
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ["node_modules", __dirname],
  moduleNameMapper: {
    "^contentlayer/generated": "<rootDir>/.contentlayer/generated",
    "^contentlayer/client": "<rootDir>/node_modules/contentlayer/dist/client",
    "^next-contentlayer/hooks":
      "<rootDir>/node_modules/next-contentlayer/dist/hooks",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(contentlayer|next-contentlayer|@contentlayer)/)",
  ],
};

// createJestConfig is exported in this way to ensure that next/jest can load the Next.js configuration, which is async
module.exports = createJestConfig(customJestConfig);

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
