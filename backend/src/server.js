const app = require("../server");

if (require.main === module) {
  app.startServer().catch((error) => {
    console.error("Backend startup failed:", error);
    process.exit(1);
  });
}

module.exports = app;
