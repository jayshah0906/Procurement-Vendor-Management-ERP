import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { AuditService } from "./AuditService";

export class MasterDataService {
  // ==========================================
  // CATEGORIES CRUD
  // ==========================================

  static async getCategories(organizationId: string | null) {
    return await prisma.procurement_categories.findMany({
      where: { organization_id: organizationId, deleted_at: null },
      orderBy: { name: "asc" },
    });
  }

  static async createCategory(
    actorId: string,
    organizationId: string | null,
    data: { name: string; description?: string }
  ) {
    const existing = await prisma.procurement_categories.findFirst({
      where: { organization_id: organizationId, name: data.name, deleted_at: null },
    });

    if (existing) {
      throw new BadRequestError(`Procurement category '${data.name}' already exists`);
    }

    return await prisma.$transaction(async (tx) => {
      const category = await tx.procurement_categories.create({
        data: {
          organization_id: organizationId,
          name: data.name,
          description: data.description || null,
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "procurement_categories",
        entityId: category.id,
        action: "CATEGORY_CREATED",
        newValue: { name: category.name },
      });

      return category;
    });
  }

  static async updateCategory(
    actorId: string,
    organizationId: string | null,
    categoryId: string,
    data: { name?: string; description?: string }
  ) {
    const category = await prisma.procurement_categories.findFirst({
      where: { id: categoryId, organization_id: organizationId, deleted_at: null },
    });

    if (!category) {
      throw new NotFoundError("Procurement category not found");
    }

    if (data.name && data.name !== category.name) {
      const existing = await prisma.procurement_categories.findFirst({
        where: { organization_id: organizationId, name: data.name, deleted_at: null },
      });
      if (existing) {
        throw new BadRequestError(`Procurement category '${data.name}' already exists`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.procurement_categories.update({
        where: { id: categoryId },
        data: {
          name: data.name !== undefined ? data.name : category.name,
          description: data.description !== undefined ? data.description : category.description,
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "procurement_categories",
        entityId: categoryId,
        action: "CATEGORY_UPDATED",
        oldValue: { name: category.name, description: category.description },
        newValue: { name: updated.name, description: updated.description },
      });

      return updated;
    });
  }

  static async deleteCategory(actorId: string, organizationId: string | null, categoryId: string) {
    const category = await prisma.procurement_categories.findFirst({
      where: { id: categoryId, organization_id: organizationId, deleted_at: null },
    });

    if (!category) {
      throw new NotFoundError("Procurement category not found");
    }

    // Verify no active vendors/rfqs are using it
    const vendorCount = await prisma.vendors.count({
      where: { category_id: categoryId, deleted_at: null },
    });
    if (vendorCount > 0) {
      throw new BadRequestError("Cannot delete category: vendors are linked to it");
    }

    const rfqCount = await prisma.rfqs.count({
      where: { category_id: categoryId, deleted_at: null },
    });
    if (rfqCount > 0) {
      throw new BadRequestError("Cannot delete category: RFQs are linked to it");
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.procurement_categories.update({
        where: { id: categoryId },
        data: { deleted_at: new Date() },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "procurement_categories",
        entityId: categoryId,
        action: "CATEGORY_DELETED",
        oldValue: { name: category.name },
      });

      return { message: "Procurement category deleted successfully" };
    });
  }

  // ==========================================
  // STATIC MASTER LISTS
  // ==========================================

  static getUnits() {
    return ["NOS", "KG", "BOX", "LTR"];
  }

  static getTaxCodes() {
    return [
      { code: "GST0", percentage: 0.00, description: "Exempted / Zero Tax" },
      { code: "GST5", percentage: 5.00, description: "GST 5%" },
      { code: "GST12", percentage: 12.00, description: "GST 12%" },
      { code: "GST18", percentage: 18.00, description: "GST 18% (Standard)" },
      { code: "GST28", percentage: 28.00, description: "GST 28%" },
    ];
  }

  static getCurrencies() {
    return [
      { code: "INR", name: "Indian Rupee", symbol: "₹" },
      { code: "USD", name: "US Dollar", symbol: "$" },
      { code: "EUR", name: "Euro", symbol: "€" },
      { code: "GBP", name: "Pound Sterling", symbol: "£" },
    ];
  }
}
