import { Router } from "express";
import { VendorController } from "../controllers/VendorController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createVendorSchema,
  updateVendorSchema,
  patchVendorStatusSchema,
} from "../validators/vendor.schema";

const router = Router();

router.post(
  "/vendors",
  authenticateToken,
  requirePermission("vendor", "create"),
  validate(createVendorSchema),
  VendorController.createVendor
);

router.get(
  "/vendors",
  authenticateToken,
  requirePermission("vendor", "view"),
  VendorController.getVendors
);

router.get(
  "/vendors/:id",
  authenticateToken,
  requirePermission("vendor", "view"),
  VendorController.getVendorById
);

router.put(
  "/vendors/:id",
  authenticateToken,
  requirePermission("vendor", "update"),
  validate(updateVendorSchema),
  VendorController.updateVendor
);

router.patch(
  "/vendors/:id/status",
  authenticateToken,
  requirePermission("vendor", "approve"),
  validate(patchVendorStatusSchema),
  VendorController.patchVendorStatus
);

export default router;
