import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { UnauthorizedError, NotFoundError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { JwtPayload } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET || "vendorbridge-erp-jwt-access-token-secret-key-2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "vendorbridge-erp-jwt-refresh-token-secret-key-2026";

export class AuthService {
  static async login(email: string, password: string, ipAddress?: string) {
    // 1. Fetch user by email
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: { permissions: true },
            },
          },
        },
        vendors_users_vendor_idTovendors: true,
      },
    });

    if (!user || user.deleted_at !== null) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.is_active) {
      throw new UnauthorizedError("Your account has been deactivated");
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // 3. Resolve permissions
    const permissions = user.roles.role_permissions.map(
      (rp) => `${rp.permissions.resource}.${rp.permissions.action}`
    );

    // 4. Generate JWT tokens
    const payload: JwtPayload = {
      user_id: user.id,
      organization_id: user.organization_id || "",
      role: user.roles.name,
      role_id: user.role_id,
      vendor_id: user.vendor_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ user_id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // 5. Update last login and record audit log transactionally
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });

      await AuditService.record(tx, {
        actorId: user.id,
        organizationId: user.organization_id,
        entityType: "users",
        entityId: user.id,
        action: "USER_LOGIN",
        ipAddress,
        newValue: { email: user.email },
      });
    });

    return {
      token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.roles.name,
        organization_id: user.organization_id,
        vendor_id: user.vendor_id,
        is_vendor: user.vendor_id !== null,
        permissions,
      },
    };
  }

  static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { user_id: string };
      
      const user = await prisma.users.findUnique({
        where: { id: decoded.user_id },
        include: { roles: true },
      });

      if (!user || !user.is_active || user.deleted_at !== null) {
        throw new UnauthorizedError("User is inactive or deleted");
      }

      const payload: JwtPayload = {
        user_id: user.id,
        organization_id: user.organization_id || "",
        role: user.roles.name,
        role_id: user.role_id,
        vendor_id: user.vendor_id,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
      return { token };
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }
  }

  static async logout(userId: string, organizationId: string | null, ipAddress?: string) {
    await prisma.$transaction(async (tx) => {
      await AuditService.record(tx, {
        actorId: userId,
        organizationId,
        entityType: "users",
        entityId: userId,
        action: "USER_LOGOUT",
        ipAddress,
      });
    });
  }

  static async getMe(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: { permissions: true },
            },
          },
        },
      },
    });

    if (!user || user.deleted_at !== null) {
      throw new NotFoundError("User not found");
    }

    const permissions = user.roles.role_permissions.map(
      (rp) => `${rp.permissions.resource}.${rp.permissions.action}`
    );

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.roles.name,
      organization_id: user.organization_id,
      vendor_id: user.vendor_id,
      is_vendor: user.vendor_id !== null,
      permissions,
    };
  }
}
