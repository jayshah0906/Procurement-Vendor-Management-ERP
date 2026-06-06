import { z } from "zod";

const quotationItemSchema = z.object({
  rfq_item_id: z.string().uuid("RFQ Item ID must be a valid UUID"),
  item_name: z.string().min(1, "Item name is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit_price: z.number().nonnegative("Unit price cannot be negative"),
  delivery_days: z.number().int().positive("Delivery days must be positive").optional(),
});

const quotationUpdateItemSchema = z.object({
  id: z.string().uuid("Quotation Item ID must be a valid UUID").optional(),
  rfq_item_id: z.string().uuid("RFQ Item ID must be a valid UUID").optional(),
  item_name: z.string().min(1, "Item name is required").optional(),
  quantity: z.number().positive("Quantity must be positive").optional(),
  unit_price: z.number().nonnegative("Unit price cannot be negative").optional(),
  delivery_days: z.number().int().positive("Delivery days must be positive").optional(),
});

export const createQuotationSchema = {
  body: z.object({
    rfq_id: z.string().uuid("RFQ ID must be a valid UUID"),
    items: z.array(quotationItemSchema).min(1, "At least one item is required"),
    subtotal: z.number().nonnegative("Subtotal cannot be negative"),
    tax_amount: z.number().nonnegative("Tax amount cannot be negative"),
    grand_total: z.number().nonnegative("Grand total cannot be negative"),
    notes: z.string().optional(),
    delivery_days: z.number().int().positive("Overall delivery days must be positive").optional(),
    valid_until: z.string().datetime("Valid until must be a valid ISO datetime").optional(),
  }),
};

export const updateQuotationSchema = {
  body: z.object({
    items: z.array(quotationUpdateItemSchema).optional(),
    subtotal: z.number().nonnegative("Subtotal cannot be negative").optional(),
    tax_amount: z.number().nonnegative("Tax amount cannot be negative").optional(),
    grand_total: z.number().nonnegative("Grand total cannot be negative").optional(),
    notes: z.string().optional(),
    delivery_days: z.number().int().positive("Overall delivery days must be positive").optional(),
    valid_until: z.string().datetime("Valid until must be a valid ISO datetime").optional(),
  }),
};

export const patchQuotationStatusSchema = {
  body: z.object({
    status: z.enum([
      "draft",
      "submitted",
      "under_review",
      "selected",
      "rejected",
    ], {
      required_error: "Status must be a valid Quotation status",
    }),
  }),
};
