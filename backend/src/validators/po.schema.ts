import { z } from "zod";

export const createPurchaseOrderSchema = {
  body: z.object({
    quotation_id: z.string().uuid("Quotation ID must be a valid UUID"),
    delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Delivery date must be in YYYY-MM-DD format"),
    shipping_address: z.string().min(1, "Shipping address is required"),
    billing_address: z.string().min(1, "Billing address is required"),
    terms: z.string().optional(),
  }),
};

export const patchPurchaseOrderStatusSchema = {
  body: z.object({
    status: z.enum([
      "generated",
      "sent",
      "accepted",
      "completed",
      "cancelled",
    ], {
      required_error: "Status must be a valid PO status",
    }),
  }),
};

const receiptItemSchema = z.object({
  item_id: z.string().uuid("PO Item ID must be a valid UUID"),
  received_quantity: z.number().positive("Received quantity must be positive"),
});

export const submitReceiptSchema = {
  body: z.object({
    items: z.array(receiptItemSchema).min(1, "At least one item receipt is required"),
  }),
};
