const config = {
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000"
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
};

export default config;
