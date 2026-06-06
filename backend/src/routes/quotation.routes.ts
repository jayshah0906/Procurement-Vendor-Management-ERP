import { Router } from "express";
import { QuotationController } from "../controllers/QuotationController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createQuotationSchema,
  updateQuotationSchema,
  patchQuotationStatusSchema,
} from "../validators/quotation.schema";

const router = Router();

router.post(
  "/quotations",
  authenticateToken,
  requirePermission("quotation", "create"),
  validate(createQuotationSchema),
  QuotationController.createQuotation
);

router.get(
  "/quotations",
  authenticateToken,
  requirePermission("quotation", "view"),
  QuotationController.getQuotations
);

router.get(
  "/quotations/:id",
  authenticateToken,
  requirePermission("quotation", "view"),
  QuotationController.getQuotationById
);

router.put(
  "/quotations/:id",
  authenticateToken,
  requirePermission("quotation", "update"),
  validate(updateQuotationSchema),
  QuotationController.updateQuotation
);

router.patch(
  "/quotations/:id/status",
  authenticateToken,
  requirePermission("quotation", "approve"),
  validate(patchQuotationStatusSchema),
  QuotationController.patchQuotationStatus
);

export default router;
