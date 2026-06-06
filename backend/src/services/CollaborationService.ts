import { prisma } from "../utils/prisma";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { Prisma } from "../generated/prisma/client";

// ========================================================
// COMMENT SERVICE
// ========================================================
export class CommentService {
  static async createComment(
    actorId: string,
    organizationId: string | null,
    data: {
      entity_type: string;
      entity_id: string;
      comment: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const comment = await tx.comments.create({
        data: {
          organization_id: organizationId,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          user_id: actorId,
          comment: data.comment,
        },
      });

      // Write Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "comments",
        entityId: comment.id,
        action: "COMMENT_ADDED",
        newValue: { entity_type: data.entity_type, entity_id: data.entity_id },
      });

      return comment;
    });
  }

  static async getComments(organizationId: string | null, entityType: string, entityId: string) {
    return await prisma.comments.findMany({
      where: {
        organization_id: organizationId,
        entity_type: entityType,
        entity_id: entityId,
        deleted_at: null,
      },
      orderBy: { created_at: "asc" },
      include: {
        users: {
          select: { first_name: true, last_name: true, email: true },
        },
      },
    });
  }
}

// ========================================================
// ATTACHMENT SERVICE
// ========================================================
export class AttachmentService {
  static async createAttachment(
    actorId: string,
    organizationId: string | null,
    file: {
      filename: string;
      path: string;
      size: number;
      mimetype: string;
    },
    data: {
      entity_type: string;
      entity_id: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.attachments.create({
        data: {
          organization_id: organizationId,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          file_name: file.filename,
          file_url: `/uploads/${file.filename}`, // Serves uploaded files locally
          file_size_bytes: file.size,
          mime_type: file.mimetype,
          uploaded_by: actorId,
        },
      });

      // Write Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "attachments",
        entityId: attachment.id,
        action: "ATTACHMENT_UPLOADED",
        newValue: { file_name: attachment.file_name, entity_type: data.entity_type },
      });

      return attachment;
    });
  }

  static async getAttachments(organizationId: string | null, entityType: string, entityId: string) {
    return await prisma.attachments.findMany({
      where: {
        organization_id: organizationId,
        entity_type: entityType,
        entity_id: entityId,
        deleted_at: null,
      },
      orderBy: { uploaded_at: "desc" },
    });
  }

  static async deleteAttachment(actorId: string, organizationId: string | null, attachmentId: string) {
    const attachment = await prisma.attachments.findFirst({
      where: { id: attachmentId, organization_id: organizationId, deleted_at: null },
    });

    if (!attachment) {
      throw new NotFoundError("Attachment not found");
    }

    return await prisma.$transaction(async (tx) => {
      const deleted = await tx.attachments.update({
        where: { id: attachmentId },
        data: { deleted_at: new Date() },
      });

      // Write Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "attachments",
        entityId: attachmentId,
        action: "ATTACHMENT_DELETED",
        oldValue: { file_name: attachment.file_name },
      });

      return { message: "Attachment deleted successfully" };
    });
  }
}

// ========================================================
// NOTIFICATION SERVICE
// ========================================================
export class NotificationService {
  static async createNotification(
    tx: Prisma.TransactionClient,
    userId: string,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ) {
    return await tx.notifications.create({
      data: {
        user_id: userId,
        title,
        message,
        is_read: false,
        related_entity_type: relatedEntityType || null,
        related_entity_id: relatedEntityId || null,
      },
    });
  }

  static async getNotifications(userId: string) {
    return await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
  }

  static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notifications.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenError("You can only update your own notifications");
    }

    return await prisma.notifications.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  }
}
