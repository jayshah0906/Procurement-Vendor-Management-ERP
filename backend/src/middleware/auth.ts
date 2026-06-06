import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        organizationId: string;
        role: string;
        roleId: number;
        vendorId: string | null;
      };
    }
  }
}

export interface JwtPayload {
  user_id: string;
  organization_id: string;
  role: string;
  role_id: number;
  vendor_id: string | null;
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Authentication token is missing");
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "vendorbridge-erp-jwt-access-token-secret-key-2026");
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired authentication token");
    }

    const payload = decoded as JwtPayload;

    // Verify user exists and is active in database
    const user = await prisma.users.findUnique({
      where: { id: payload.user_id },
      include: { roles: true },
    });

    if (!user || !user.is_active || user.deleted_at !== null) {
      throw new UnauthorizedError("User account is inactive or deleted");
    }

    req.user = {
      userId: user.id,
      organizationId: user.organization_id || payload.organization_id,
      role: user.roles.name,
      roleId: user.role_id,
      vendorId: user.vendor_id,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      // Procurement Manager bypasses all permission checks
      if (req.user.role === "Procurement Manager") {
        return next();
      }

      // Check if user's role has the required permission
      const permission = await prisma.role_permissions.findFirst({
        where: {
          role_id: req.user.roleId,
          permissions: {
            resource,
            action,
          },
        },
      });

      if (!permission) {
        throw new ForbiddenError(`Insufficient permissions to perform ${action} on ${resource}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Scoping helper to verify vendors only access their own data
export function checkVendorAccess(vendorIdFromData: string | null | undefined, userVendorId: string | null) {
  if (userVendorId) {
    if (!vendorIdFromData || vendorIdFromData !== userVendorId) {
      throw new ForbiddenError("Access denied: You can only access your own vendor records");
    }
  }
}
