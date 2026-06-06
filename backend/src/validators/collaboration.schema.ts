import { z } from "zod";

export const createCommentSchema = {
  body: z.object({
    entity_type: z.string().min(1, "Entity type is required"),
    entity_id: z.string().uuid("Entity ID must be a valid UUID"),
    comment: z.string().min(1, "Comment content cannot be empty"),
  }),
};

export const queryCommentsSchema = {
  query: z.object({
    entity_type: z.string({
      required_error: "Entity type is required",
    }),
    entity_id: z.string().uuid("Entity ID must be a valid UUID"),
  }),
};

export const createAttachmentSchema = {
  body: z.object({
    entity_type: z.string().min(1, "Entity type is required"),
    entity_id: z.string().uuid("Entity ID must be a valid UUID"),
  }),
};

export const queryAttachmentsSchema = {
  query: z.object({
    entity_type: z.string({
      required_error: "Entity type is required",
    }),
    entity_id: z.string().uuid("Entity ID must be a valid UUID"),
  }),
};
