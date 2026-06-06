import { z } from "zod";

export const createVendorSchema = {
  body: z.object({
    company_name: z.string().min(1, "Company name is required"),
    gst_number: z.string().optional(),
    contact_person: z.string().optional(),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    address: z.string().optional(),
    category_id: z.string().uuid("Category ID must be a valid UUID").optional(),
  }),
};

export const updateVendorSchema = {
  body: z.object({
    company_name: z.string().min(1, "Company name is required").optional(),
    gst_number: z.string().optional(),
    contact_person: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    category_id: z.string().uuid("Category ID must be a valid UUID").optional(),
  }),
};

export const patchVendorStatusSchema = {
  body: z.object({
    status: z.enum(["pending", "active", "blocked", "rejected"], {
      required_error: "Status is required and must be pending, active, blocked, or rejected",
    }),
  }),
};

export const createCategorySchema = {
  body: z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
  }),
};

export const updateCategorySchema = {
  body: z.object({
    name: z.string().min(1, "Category name is required").optional(),
    description: z.string().optional(),
  }),
};
