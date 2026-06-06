import { z } from "zod";

export const createInvoiceSchema = {
  body: z.object({
    purchase_order_id: z.string().uuid("Purchase Order ID must be a valid UUID"),
    invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invoice date must be in YYYY-MM-DD format"),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format"),
    subtotal: z.number().nonnegative("Subtotal cannot be negative"),
    cgst: z.number().nonnegative("CGST cannot be negative").optional().default(0),
    sgst: z.number().nonnegative("SGST cannot be negative").optional().default(0),
    igst: z.number().nonnegative("IGST cannot be negative").optional().default(0),
    grand_total: z.number().positive("Grand total must be positive"),
  }),
};

export const patchInvoiceStatusSchema = {
  body: z.object({
    status: z.enum([
      "pending",
      "sent",
      "paid",
      "overdue",
      "cancelled",
    ], {
      required_error: "Status must be a valid invoice status",
    }),
  }),
};

export const markPaidSchema = {
  body: z.object({
    paid_at: z.string().datetime("Paid date must be a valid ISO datetime"),
  }),
};
