import { Router } from "express";
import { InvoiceController } from "../controllers/InvoiceController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createInvoiceSchema,
  patchInvoiceStatusSchema,
  markPaidSchema,
} from "../validators/invoice.schema";

const router = Router();

router.post(
  "/invoices",
  authenticateToken,
  requirePermission("invoice", "create"),
  validate(createInvoiceSchema),
  InvoiceController.createInvoice
);

router.get(
  "/invoices",
  authenticateToken,
  requirePermission("invoice", "view"),
  InvoiceController.getInvoices
);

router.get(
  "/invoices/:id",
  authenticateToken,
  requirePermission("invoice", "view"),
  InvoiceController.getInvoiceById
);

router.patch(
  "/invoices/:id/status",
  authenticateToken,
  requirePermission("invoice", "approve"),
  validate(patchInvoiceStatusSchema),
  InvoiceController.patchInvoiceStatus
);

router.post(
  "/invoices/:id/mark-paid",
  authenticateToken,
  requirePermission("invoice", "pay"),
  validate(markPaidSchema),
  InvoiceController.markPaid
);

export default router;
