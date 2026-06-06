import { Router } from "express";
import { MasterDataController } from "../controllers/MasterDataController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "../validators/vendor.schema";

const router = Router();

// Categories CRUD
router.get(
  "/categories",
  authenticateToken,
  requirePermission("vendor", "view"),
  MasterDataController.getCategories
);

router.post(
  "/categories",
  authenticateToken,
  requirePermission("vendor", "create"),
  validate(createCategorySchema),
  MasterDataController.createCategory
);

router.put(
  "/categories/:id",
  authenticateToken,
  requirePermission("vendor", "update"),
  validate(updateCategorySchema),
  MasterDataController.updateCategory
);

router.delete(
  "/categories/:id",
  authenticateToken,
  requirePermission("vendor", "blacklist"),
  MasterDataController.deleteCategory
);

// Lookups (accessible to any authenticated user)
router.get("/units", authenticateToken, MasterDataController.getUnits);
router.get("/tax-codes", authenticateToken, MasterDataController.getTaxCodes);
router.get("/currencies", authenticateToken, MasterDataController.getCurrencies);

export default router;
