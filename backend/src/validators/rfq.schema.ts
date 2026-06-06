import { z } from "zod";

const rfqItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().optional().default("NOS"),
  estimated_unit_price: z.number().positive("Estimated unit price must be positive").optional(),
});

const rfqUpdateItemSchema = z.object({
  id: z.string().uuid("Item ID must be a valid UUID").optional(),
  item_name: z.string().min(1, "Item name is required").optional(),
  description: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive").optional(),
  unit: z.string().optional(),
  estimated_unit_price: z.number().positive("Estimated unit price must be positive").optional(),
});

export const createRfqSchema = {
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    category_id: z.string().uuid("Category ID must be a valid UUID"),
    deadline: z.string().datetime("Deadline must be a valid ISO datetime"),
    items: z.array(rfqItemSchema).min(1, "At least one item is required"),
  }),
};

export const updateRfqSchema = {
  body: z.object({
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().optional(),
    category_id: z.string().uuid("Category ID must be a valid UUID").optional(),
    deadline: z.string().datetime("Deadline must be a valid ISO datetime").optional(),
    items: z.array(rfqUpdateItemSchema).optional(),
  }),
};

export const patchRfqStatusSchema = {
  body: z.object({
    status: z.enum([
      "draft",
      "published",
      "quotation_open",
      "quotation_closed",
      "under_review",
      "approved",
      "rejected",
      "converted_to_po",
    ], {
      required_error: "Status must be a valid RFQ status",
    }),
  }),
};

export const inviteVendorsSchema = {
  body: z.object({
    vendor_ids: z.array(z.string().uuid("Vendor ID must be a valid UUID")).min(1, "At least one vendor ID is required"),
  }),
};
