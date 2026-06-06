import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { vendor_status } from "../generated/prisma/client";

export class VendorService {
  static async createVendor(
    actorId: string,
    organizationId: string | null,
    data: {
      company_name: string;
      gst_number?: string;
      contact_person?: string;
      email: string;
      phone?: string;
      address?: string;
      category_id?: string;
    }
  ) {
    if (data.category_id) {
      const category = await prisma.procurement_categories.findFirst({
        where: { id: data.category_id, organization_id: organizationId, deleted_at: null },
      });
      if (!category) {
        throw new NotFoundError("Procurement category not found");
      }
    }

    return await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendors.create({
        data: {
          organization_id: organizationId,
          category_id: data.category_id || null,
          company_name: data.company_name,
          gst_number: data.gst_number || null,
          contact_person: data.contact_person || null,
          email: data.email,
          phone: data.phone || null,
          address: data.address || null,
          status: "pending",
          onboarding_completed: false,
          created_by: actorId,
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "vendors",
        entityId: vendor.id,
        action: "VENDOR_CREATED",
        newValue: { company_name: vendor.company_name, email: vendor.email, status: vendor.status },
      });

      return vendor;
    });
  }

  static async getVendors(
    organizationId: string | null,
    filters: {
      status?: vendor_status;
      category_id?: string;
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

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.category_id) {
      where.category_id = filters.category_id;
    }

    const [vendors, total] = await Promise.all([
      prisma.vendors.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { procurement_categories: true },
      }),
      prisma.vendors.count({ where }),
    ]);

    return {
      vendors: vendors.map((v) => ({
        id: v.id,
        company_name: v.company_name,
        gst_number: v.gst_number,
        contact_person: v.contact_person,
        email: v.email,
        phone: v.phone,
        address: v.address,
        status: v.status,
        rating: v.rating,
        onboarding_completed: v.onboarding_completed,
        category: v.procurement_categories ? v.procurement_categories.name : null,
        category_id: v.category_id,
        created_at: v.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getVendorById(organizationId: string | null, vendorId: string) {
    const vendor = await prisma.vendors.findFirst({
      where: { id: vendorId, organization_id: organizationId, deleted_at: null },
      include: { procurement_categories: true },
    });

    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }

    // Fetch vendor summary metrics
    const quotationsCount = await prisma.quotations.count({
      where: { vendor_id: vendorId, deleted_at: null },
    });
    const poCount = await prisma.purchase_orders.count({
      where: { vendor_id: vendorId, deleted_at: null },
    });
    const totalSpendResult = await prisma.purchase_orders.aggregate({
      where: { vendor_id: vendorId, status: "completed", deleted_at: null },
      _sum: { total_amount: true },
    });

    return {
      profile: {
        id: vendor.id,
        company_name: vendor.company_name,
        gst_number: vendor.gst_number,
        contact_person: vendor.contact_person,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        status: vendor.status,
        rating: vendor.rating,
        onboarding_completed: vendor.onboarding_completed,
        category: vendor.procurement_categories ? vendor.procurement_categories.name : null,
        category_id: vendor.category_id,
        created_at: vendor.created_at,
      },
      metrics: {
        total_quotations: quotationsCount,
        total_purchase_orders: poCount,
        total_spend: totalSpendResult._sum.total_amount || 0,
      },
    };
  }

  static async updateVendor(
    actorId: string,
    organizationId: string | null,
    vendorId: string,
    data: {
      company_name?: string;
      gst_number?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
      category_id?: string;
    }
  ) {
    const vendor = await prisma.vendors.findFirst({
      where: { id: vendorId, organization_id: organizationId, deleted_at: null },
    });

    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }

    if (data.category_id) {
      const category = await prisma.procurement_categories.findFirst({
        where: { id: data.category_id, organization_id: organizationId, deleted_at: null },
      });
      if (!category) {
        throw new NotFoundError("Procurement category not found");
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendors.update({
        where: { id: vendorId },
        data: {
          company_name: data.company_name !== undefined ? data.company_name : vendor.company_name,
          gst_number: data.gst_number !== undefined ? data.gst_number : vendor.gst_number,
          contact_person: data.contact_person !== undefined ? data.contact_person : vendor.contact_person,
          email: data.email !== undefined ? data.email : vendor.email,
          phone: data.phone !== undefined ? data.phone : vendor.phone,
          address: data.address !== undefined ? data.address : vendor.address,
          category_id: data.category_id !== undefined ? data.category_id : vendor.category_id,
          onboarding_completed: true, // Complete onboarding on profile update
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "vendors",
        entityId: vendorId,
        action: "VENDOR_UPDATED",
        oldValue: { company_name: vendor.company_name, contact_person: vendor.contact_person, email: vendor.email },
        newValue: { company_name: updatedVendor.company_name, contact_person: updatedVendor.contact_person, email: updatedVendor.email },
      });

      return updatedVendor;
    });
  }

  static async patchVendorStatus(
    actorId: string,
    organizationId: string | null,
    vendorId: string,
    status: vendor_status
  ) {
    const vendor = await prisma.vendors.findFirst({
      where: { id: vendorId, organization_id: organizationId, deleted_at: null },
    });

    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }

    return await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendors.update({
        where: { id: vendorId },
        data: { status },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "vendors",
        entityId: vendorId,
        action: "VENDOR_STATUS_PATCHED",
        oldValue: { status: vendor.status },
        newValue: { status },
      });

      return updatedVendor;
    });
  }
}
