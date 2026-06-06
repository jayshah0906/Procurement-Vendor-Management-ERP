import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { CollaborationController } from "../controllers/CollaborationController";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createCommentSchema,
  queryCommentsSchema,
  createAttachmentSchema,
  queryAttachmentsSchema,
} from "../validators/collaboration.schema";

const router = Router();

// Configure Multer for File Uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Comments routes
router.post(
  "/comments",
  authenticateToken,
  validate(createCommentSchema),
  CollaborationController.createComment
);

router.get(
  "/comments",
  authenticateToken,
  validate(queryCommentsSchema),
  CollaborationController.getComments
);

// Attachments routes
router.post(
  "/attachments",
  authenticateToken,
  upload.single("file"),
  validate(createAttachmentSchema),
  CollaborationController.createAttachment
);

router.get(
  "/attachments",
  authenticateToken,
  validate(queryAttachmentsSchema),
  CollaborationController.getAttachments
);

router.delete(
  "/attachments/:id",
  authenticateToken,
  CollaborationController.deleteAttachment
);

// Notifications routes
router.get(
  "/notifications",
  authenticateToken,
  CollaborationController.getNotifications
);

router.patch(
  "/notifications/:id/read",
  authenticateToken,
  CollaborationController.markNotificationAsRead
);

export default router;
