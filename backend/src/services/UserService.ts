import * as bcrypt from "bcrypt";
import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { AuditService } from "./AuditService";

export class UserService {
  // ==========================================
  // USERS BUSINESS LOGIC
  // ==========================================

  static async createUser(
    actorId: string,
    organizationId: string | null,
    data: {
      first_name: string;
      last_name?: string;
      email: string;
      role_id: number;
      phone?: string;
      vendor_id?: string;
    }
  ) {
    // 1. Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new BadRequestError(`User with email ${data.email} already exists`);
    }

    // 2. Validate role
    const role = await prisma.roles.findUnique({
      where: { id: data.role_id },
    });
    if (!role) {
      throw new NotFoundError(`Role with ID ${data.role_id} not found`);
    }

    // 3. Hash default password 'password123'
    const passwordHash = await bcrypt.hash("password123", 10);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          organization_id: organizationId,
          role_id: data.role_id,
          vendor_id: data.vendor_id || null,
          first_name: data.first_name,
          last_name: data.last_name || null,
          email: data.email,
          password_hash: passwordHash,
          phone: data.phone || null,
          is_active: true,
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "users",
        entityId: user.id,
        action: "USER_CREATED",
        newValue: { email: user.email, role_id: user.role_id, vendor_id: user.vendor_id },
      });

      return user;
    });
  }

  static async getUsers(
    organizationId: string | null,
    filters: {
      role_id?: number;
      vendor_id?: string;
      status?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      organization_id: organizationId,
      deleted_at: null,
    };

    if (filters.role_id !== undefined) {
      where.role_id = filters.role_id;
    }
    if (filters.vendor_id !== undefined) {
      where.vendor_id = filters.vendor_id;
    }
    if (filters.status !== undefined) {
      where.is_active = filters.status;
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { roles: true },
      }),
      prisma.users.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        role: u.roles.name,
        role_id: u.role_id,
        vendor_id: u.vendor_id,
        is_active: u.is_active,
        created_at: u.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserById(organizationId: string | null, userId: string) {
    const user = await prisma.users.findFirst({
      where: { id: userId, organization_id: organizationId, deleted_at: null },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.roles.name,
      role_id: user.role_id,
      vendor_id: user.vendor_id,
      is_active: user.is_active,
      created_at: user.created_at,
    };
  }

  static async updateUser(
    actorId: string,
    organizationId: string | null,
    userId: string,
    data: {
      first_name?: string;
      last_name?: string;
      role_id?: number;
      phone?: string;
      is_active?: boolean;
    }
  ) {
    const user = await prisma.users.findFirst({
      where: { id: userId, organization_id: organizationId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (data.role_id !== undefined) {
      const role = await prisma.roles.findUnique({ where: { id: data.role_id } });
      if (!role) {
        throw new NotFoundError(`Role ${data.role_id} not found`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: {
          first_name: data.first_name !== undefined ? data.first_name : user.first_name,
          last_name: data.last_name !== undefined ? data.last_name : user.last_name,
          role_id: data.role_id !== undefined ? data.role_id : user.role_id,
          phone: data.phone !== undefined ? data.phone : user.phone,
          is_active: data.is_active !== undefined ? data.is_active : user.is_active,
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "users",
        entityId: userId,
        action: "USER_UPDATED",
        oldValue: { first_name: user.first_name, last_name: user.last_name, role_id: user.role_id, is_active: user.is_active },
        newValue: { first_name: updatedUser.first_name, last_name: updatedUser.last_name, role_id: updatedUser.role_id, is_active: updatedUser.is_active },
      });

      return updatedUser;
    });
  }

  static async patchUserStatus(
    actorId: string,
    organizationId: string | null,
    userId: string,
    isActive: boolean
  ) {
    const user = await prisma.users.findFirst({
      where: { id: userId, organization_id: organizationId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: { is_active: isActive },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "users",
        entityId: userId,
        action: "USER_STATUS_PATCHED",
        oldValue: { is_active: user.is_active },
        newValue: { is_active: isActive },
      });

      return updatedUser;
    });
  }

  // ==========================================
  // ROLES & PERMISSIONS BUSINESS LOGIC
  // ==========================================

  static async getRoles() {
    const roles = await prisma.roles.findMany({
      include: {
        role_permissions: {
          include: { permissions: true },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.role_permissions.map(
        (rp) => `${rp.permissions.resource}.${rp.permissions.action}`
      ),
    }));
  }

  static async getRoleById(roleId: number) {
    const role = await prisma.roles.findUnique({
      where: { id: roleId },
      include: {
        role_permissions: {
          include: { permissions: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.role_permissions.map(
        (rp) => `${rp.permissions.resource}.${rp.permissions.action}`
      ),
    };
  }

  static async createRole(
    actorId: string,
    organizationId: string | null,
    data: {
      name: string;
      description?: string;
      permissions: string[]; // e.g. ["rfq.create", "quotation.view"]
    }
  ) {
    const existing = await prisma.roles.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new BadRequestError(`Role ${data.name} already exists`);
    }

    // Resolve string permissions to DB records
    const resolvedPerms = await this.resolvePermissionStrings(data.permissions);

    return await prisma.$transaction(async (tx) => {
      const role = await tx.roles.create({
        data: {
          name: data.name,
          description: data.description || null,
        },
      });

      // Link permissions
      if (resolvedPerms.length > 0) {
        await tx.role_permissions.createMany({
          data: resolvedPerms.map((p) => ({
            role_id: role.id,
            permission_id: p.id,
          })),
        });
      }

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "roles",
        entityId: role.id.toString(),
        action: "ROLE_CREATED",
        newValue: { name: role.name, permissions: data.permissions },
      });

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: data.permissions,
      };
    });
  }

  static async updateRole(
    actorId: string,
    organizationId: string | null,
    roleId: number,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
    }
  ) {
    const role = await prisma.roles.findUnique({
      where: { id: roleId },
      include: {
        role_permissions: {
          include: { permissions: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    const oldPerms = role.role_permissions.map(
      (rp) => `${rp.permissions.resource}.${rp.permissions.action}`
    );

    let resolvedPerms: { id: number }[] = [];
    if (data.permissions) {
      resolvedPerms = await this.resolvePermissionStrings(data.permissions);
    }

    return await prisma.$transaction(async (tx) => {
      const updatedRole = await tx.roles.update({
        where: { id: roleId },
        data: {
          name: data.name !== undefined ? data.name : role.name,
          description: data.description !== undefined ? data.description : role.description,
        },
      });

      if (data.permissions) {
        // Clear existing connections
        await tx.role_permissions.deleteMany({
          where: { role_id: roleId },
        });

        // Insert new ones
        if (resolvedPerms.length > 0) {
          await tx.role_permissions.createMany({
            data: resolvedPerms.map((p) => ({
              role_id: roleId,
              permission_id: p.id,
            })),
          });
        }
      }

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "roles",
        entityId: roleId.toString(),
        action: "ROLE_UPDATED",
        oldValue: { name: role.name, permissions: oldPerms },
        newValue: { name: updatedRole.name, permissions: data.permissions || oldPerms },
      });

      return {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: data.permissions || oldPerms,
      };
    });
  }

  static async deleteRole(actorId: string, organizationId: string | null, roleId: number) {
    const role = await prisma.roles.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundError("Role not found");
    }

    return await prisma.$transaction(async (tx) => {
      // Disconnect all role-permissions (cascade handles it in schema but safe to do)
      await tx.role_permissions.deleteMany({ where: { role_id: roleId } });

      // Note: in Postgres this is real DELETE, not soft delete since roles table doesn't have deleted_at.
      const deleted = await tx.roles.delete({ where: { id: roleId } });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "roles",
        entityId: roleId.toString(),
        action: "ROLE_DELETED",
        oldValue: { name: deleted.name },
      });

      return { message: "Role deactivated and deleted successfully" };
    });
  }

  static async getPermissions() {
    const perms = await prisma.permissions.findMany();
    return perms.map((p) => `${p.resource}.${p.action}`);
  }

  // Helper helper to look up permission models by string key
  private static async resolvePermissionStrings(strings: string[]) {
    const resolved: { id: number }[] = [];
    for (const str of strings) {
      const parts = str.split(".");
      if (parts.length !== 2) {
        throw new BadRequestError(`Invalid permission format: ${str}. Must be 'resource.action'`);
      }
      const [resource, action] = parts;
      const perm = await prisma.permissions.findUnique({
        where: { resource_action: { resource, action } },
      });
      if (!perm) {
        throw new NotFoundError(`Permission ${str} does not exist in database`);
      }
      resolved.push(perm);
    }
    return resolved;
  }
}
