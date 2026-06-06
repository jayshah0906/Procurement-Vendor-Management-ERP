import { Router } from "express";
import { PurchaseOrderController } from "../controllers/PurchaseOrderController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createPurchaseOrderSchema,
  patchPurchaseOrderStatusSchema,
  submitReceiptSchema,
} from "../validators/po.schema";

const router = Router();

router.post(
  "/purchase-orders",
  authenticateToken,
  requirePermission("po", "create"),
  validate(createPurchaseOrderSchema),
  PurchaseOrderController.createPurchaseOrder
);

router.get(
  "/purchase-orders",
  authenticateToken,
  requirePermission("po", "view"),
  PurchaseOrderController.getPurchaseOrders
);

router.get(
  "/purchase-orders/:id",
  authenticateToken,
  requirePermission("po", "view"),
  PurchaseOrderController.getPurchaseOrderById
);

router.patch(
  "/purchase-orders/:id/status",
  authenticateToken,
  validate(patchPurchaseOrderStatusSchema),
  PurchaseOrderController.patchPurchaseOrderStatus
);

router.post(
  "/purchase-orders/:id/receipts",
  authenticateToken,
  requirePermission("po", "receipt"),
  validate(submitReceiptSchema),
  PurchaseOrderController.submitGoodsReceipt
);

router.get(
  "/purchase-orders/:id/receipts",
  authenticateToken,
  requirePermission("po", "view"),
  PurchaseOrderController.getGoodsReceipts
);

export default router;
