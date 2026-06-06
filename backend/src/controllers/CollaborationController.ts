import { Request, Response, NextFunction } from "express";
import { CommentService, AttachmentService, NotificationService } from "../services/CollaborationService";
import { BadRequestError } from "../utils/errors";

export class CollaborationController {
  // Comments
  static async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const result = await CommentService.createComment(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const entityType = req.query.entity_type as string;
      const entityId = req.query.entity_id as string;
      const result = await CommentService.getComments(orgId, entityType, entityId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Attachments
  static async createAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      
      if (!req.file) {
        throw new BadRequestError("No file uploaded");
      }

      const file = {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };

      const result = await AttachmentService.createAttachment(actorId, orgId, file, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const entityType = req.query.entity_type as string;
      const entityId = req.query.entity_id as string;
      const result = await AttachmentService.getAttachments(orgId, entityType, entityId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const result = await AttachmentService.deleteAttachment(actorId, orgId, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Notifications
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const result = await NotificationService.getNotifications(req.user.userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markNotificationAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const result = await NotificationService.markAsRead(req.user.userId, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
