import { Router } from "express";
import { RoleController } from "../controllers/RoleController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createRoleSchema, updateRoleSchema } from "../validators/user.schema";

const router = Router();

router.get(
  "/roles",
  authenticateToken,
  requirePermission("role", "view"),
  RoleController.getRoles
);

router.get(
  "/roles/:id",
  authenticateToken,
  requirePermission("role", "view"),
  RoleController.getRoleById
);

router.post(
  "/roles",
  authenticateToken,
  requirePermission("role", "create"),
  validate(createRoleSchema),
  RoleController.createRole
);

router.put(
  "/roles/:id",
  authenticateToken,
  requirePermission("role", "update"),
  validate(updateRoleSchema),
  RoleController.updateRole
);

router.delete(
  "/roles/:id",
  authenticateToken,
  requirePermission("role", "delete"),
  RoleController.deleteRole
);

router.get(
  "/permissions",
  authenticateToken,
  requirePermission("role", "view"),
  RoleController.getPermissions
);

export default router;
