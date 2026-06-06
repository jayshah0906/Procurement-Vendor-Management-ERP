import { z } from "zod";

const approverSchema = z.object({
  approver_id: z.string().uuid("Approver ID must be a valid UUID"),
  level_no: z.number().int().positive("Level number must be positive"),
});

export const initiateApprovalSchema = {
  body: z.object({
    entity_type: z.enum(["quotation", "po", "vendor"], {
      required_error: "Entity type must be quotation, po, or vendor",
    }),
    entity_id: z.string().uuid("Entity ID must be a valid UUID"),
    approvers: z.array(approverSchema).min(1, "At least one approver is required"),
  }),
};

export const actionApprovalStepSchema = {
  body: z.object({
    action: z.enum(["approve", "reject", "request_changes"], {
      required_error: "Action must be approve, reject, or request_changes",
    }),
    remarks: z.string().optional(),
  }),
};
