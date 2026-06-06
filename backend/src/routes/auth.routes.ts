import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema, refreshSchema } from "../validators/auth.schema";

const router = Router();

router.post("/auth/login", validate(loginSchema), AuthController.login);
router.post("/auth/refresh", validate(refreshSchema), AuthController.refresh);
router.post("/auth/logout", authenticateToken, AuthController.logout);
router.get("/me", authenticateToken, AuthController.getMe);

export default router;
