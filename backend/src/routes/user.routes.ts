import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createUserSchema,
  updateUserSchema,
  patchUserStatusSchema,
} from "../validators/user.schema";

const router = Router();

router.post(
  "/users",
  authenticateToken,
  requirePermission("user", "create"),
  validate(createUserSchema),
  UserController.createUser
);

router.get(
  "/users",
  authenticateToken,
  requirePermission("user", "view"),
  UserController.getUsers
);

router.get(
  "/users/:id",
  authenticateToken,
  requirePermission("user", "view"),
  UserController.getUserById
);

router.put(
  "/users/:id",
  authenticateToken,
  requirePermission("user", "update"),
  validate(updateUserSchema),
  UserController.updateUser
);

router.patch(
  "/users/:id/status",
  authenticateToken,
  requirePermission("user", "update"),
  validate(patchUserStatusSchema),
  UserController.patchUserStatus
);

export default router;
