const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const passport = require("passport");
const swaggerUi = require("swagger-ui-express");

const routes = require("./routes");
const { errorHandler, notFound } = require("./middlewares/error.middleware");
const { globalLimiter } = require("./middlewares/rateLimiter.middleware");
const swaggerSpec = require("./config/swagger");
const logger = require("./utils/logger");

require("./config/passport");

const app = express();

//Security Middleware 
app.use(helmet());                          // HTTP security headers
app.use(mongoSanitize());                   // Prevent NoSQL injection
app.use(xss());                             // Sanitize user input from XSS

//CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//Body Parsers
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

//Logging 
if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

//Rate Limiting 
app.use("/api", globalLimiter);

//Passport (OAuth)
app.use(passport.initialize());

//Swagger Docs 
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Auth API Docs",
    customCss: ".swagger-ui .topbar { display: none }",
  })
);

// Health Check 
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

//API Routes 
app.use("/api/v1", routes);

//Error Handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
