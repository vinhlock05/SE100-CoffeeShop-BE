import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import router from "./routes";
import { errorHandler, notFoundHandler } from "./utils/handler";
import { morganMiddleware } from "./middlewares/morgan.middleware";

const app = express();

// MIDDLEWARES
// Log by morgan
app.use(morganMiddleware)

// Protected by helmet
app.use(helmet());

// Convert request to JSON
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// CORS - Allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', router);

// DEFAULT HANDLERS
// Not found handler
app.use(notFoundHandler)

// Error handler
app.use(errorHandler)

export default app;
