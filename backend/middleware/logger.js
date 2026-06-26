function logger(req, res, next) {
  const startTime = Date.now();
  const requestedAt = new Date().toISOString();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    console.log(
      `${req.method} ${req.originalUrl} ${requestedAt} ${res.statusCode} ${durationMs}ms`
    );
  });

  next();
}

module.exports = logger;
