import { z } from "zod";

export const createUserSchema = {
  body: z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    role_id: z.number().int("Role ID must be an integer"),
    phone: z.string().optional(),
    vendor_id: z.string().uuid("Vendor ID must be a valid UUID").optional(),
  }),
};

export const updateUserSchema = {
  body: z.object({
    first_name: z.string().min(1, "First name is required").optional(),
    last_name: z.string().optional(),
    role_id: z.number().int("Role ID must be an integer").optional(),
    phone: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
};

export const patchUserStatusSchema = {
  body: z.object({
    is_active: z.boolean({
      required_error: "is_active is required",
    }),
  }),
};

export const createRoleSchema = {
  body: z.object({
    name: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
    permissions: z.array(z.string()).min(1, "At least one permission is required"),
  }),
};

export const updateRoleSchema = {
  body: z.object({
    name: z.string().min(1, "Role name is required").optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
  }),
};
