import { z } from "zod";

export const registerSchema = {
  body: z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role_name: z.enum(["Procurement Officer", "Vendor"], {
      errorMap: () => ({ message: "Role must be 'Procurement Officer' or 'Vendor'" }),
    }),
    // Vendor-specific fields (required when role_name === 'Vendor')
    company_name: z.string().optional(),
    gst_number: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
};

export const refreshSchema = {
  body: z.object({
    refresh_token: z.string({
      required_error: "Refresh token is required",
    }),
  }),
};
