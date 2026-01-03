import { Router } from "express";

const router = Router();

// Health check route (already in app.ts, but can add API-specific health check here)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SE100-CoffeeShop-BE API is running',
    timestamp: new Date().toISOString() 
  });
});

// TODO: Add route modules here as they are created
// Example:
// import authRouter from "./auth.route";
// import userRouter from "./user.route";
// router.use("/auth", authRouter);
// router.use("/users", userRouter);

export default router;
