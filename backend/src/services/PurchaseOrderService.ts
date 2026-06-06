import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { po_status, Prisma } from "../generated/prisma/client";

export class PurchaseOrderService {
  static async createPurchaseOrder(
    actorId: string,
    organizationId: string,
    data: {
      quotation_id: string;
      delivery_date: string;
      shipping_address: string;
      billing_address: string;
      terms?: string;
    }
  ) {
    // 1. Verify quotation exists and is selected
    const quotation = await prisma.quotations.findFirst({
      where: { id: data.quotation_id, organization_id: organizationId, deleted_at: null },
      include: {
        quotation_items: { where: { deleted_at: null } },
        rfqs: true,
      },
    });

    if (!quotation) {
      throw new NotFoundError("Quotation not found");
    }

    if (quotation.status !== "selected") {
      throw new BadRequestError("Quotation must be approved ('selected') before generating a PO");
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Generate PO Number
      const seqResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT generate_document_number($1::uuid, $2::varchar) AS doc_number`,
        organizationId,
        "PO"
      );
      const poNumber = seqResult[0].doc_number;

      // 3. Create PO Header
      const po = await tx.purchase_orders.create({
        data: {
          organization_id: organizationId,
          po_number: poNumber,
          quotation_id: data.quotation_id,
          vendor_id: quotation.vendor_id,
          subtotal: quotation.subtotal,
          tax_amount: quotation.tax_amount,
          total_amount: quotation.grand_total,
          status: "generated",
          delivery_date: new Date(data.delivery_date),
          shipping_address: data.shipping_address,
          billing_address: data.billing_address,
          terms: data.terms || null,
          generated_by: actorId,
        },
      });

      // 4. Create PO Items mapping from Quotation Items
      const poItems = await Promise.all(
        quotation.quotation_items.map((qi) =>
          tx.purchase_order_items.create({
            data: {
              purchase_order_id: po.id,
              category_id: quotation.rfqs?.category_id || null,
              item_name: qi.item_name,
              quantity: qi.quantity,
              unit_price: qi.unit_price,
              total_price: qi.total_price,
              received_quantity: new Prisma.Decimal(0),
            },
          })
        )
      );

      // 5. Update quotation to reflect po generated
      // Wait, quotation status has a selected status but no po_generated status. Let's keep it selected or we can transition RFQ to converted_to_po!
      if (quotation.rfq_id) {
        await tx.rfqs.update({
          where: { id: quotation.rfq_id },
          data: { status: "converted_to_po" },
        });
      }

      // 6. Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "purchase_orders",
        entityId: po.id,
        action: "PO_GENERATED",
        newValue: { po_number: po.po_number, total_amount: po.total_amount },
      });

      return {
        ...po,
        items: poItems,
      };
    });
  }

  static async getPurchaseOrders(
    organizationId: string | null,
    filters: {
      vendor_id?: string;
      status?: po_status;
      page?: number;
      limit?: number;
    },
    userVendorId: string | null
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

    if (userVendorId) {
      where.vendor_id = userVendorId;
    } else if (filters.vendor_id) {
      where.vendor_id = filters.vendor_id;
    }

    const [pos, total] = await Promise.all([
      prisma.purchase_orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          vendors: {
            select: { company_name: true },
          },
        },
      }),
      prisma.purchase_orders.count({ where }),
    ]);

    return {
      purchase_orders: pos.map((po) => ({
        id: po.id,
        po_number: po.po_number,
        quotation_id: po.quotation_id,
        vendor_id: po.vendor_id,
        vendor_name: po.vendors?.company_name || null,
        subtotal: po.subtotal,
        tax_amount: po.tax_amount,
        total_amount: po.total_amount,
        status: po.status,
        delivery_date: po.delivery_date,
        created_at: po.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getPurchaseOrderById(organizationId: string | null, poId: string, userVendorId: string | null) {
    const po = await prisma.purchase_orders.findFirst({
      where: { id: poId, organization_id: organizationId, deleted_at: null },
      include: {
        purchase_order_items: { where: { deleted_at: null } },
        vendors: {
          select: { company_name: true, email: true, phone: true, address: true },
        },
        users: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    if (!po) {
      throw new NotFoundError("Purchase Order not found");
    }

    if (userVendorId && po.vendor_id !== userVendorId) {
      throw new ForbiddenError("Access denied: You can only view your own Purchase Orders");
    }

    return {
      id: po.id,
      po_number: po.po_number,
      quotation_id: po.quotation_id,
      vendor_id: po.vendor_id,
      vendor_name: po.vendors?.company_name || null,
      vendor_details: po.vendors,
      subtotal: po.subtotal,
      tax_amount: po.tax_amount,
      total_amount: po.total_amount,
      status: po.status,
      delivery_date: po.delivery_date,
      shipping_address: po.shipping_address,
      billing_address: po.billing_address,
      terms: po.terms,
      generated_by_user: po.users ? `${po.users.first_name} ${po.users.last_name || ""}`.trim() : null,
      created_at: po.created_at,
      items: po.purchase_order_items,
    };
  }

  static async patchPurchaseOrderStatus(
    user: { userId: string; role: string; roleId: number; vendorId: string | null },
    organizationId: string,
    poId: string,
    status: po_status
  ) {
    const po = await prisma.purchase_orders.findFirst({
      where: { id: poId, organization_id: organizationId, deleted_at: null },
    });

    if (!po) {
      throw new NotFoundError("Purchase Order not found");
    }

    // Role and permission checks
    if (user.vendorId) {
      // Vendor scoping check
      if (po.vendor_id !== user.vendorId) {
        throw new ForbiddenError("Access denied: You can only update your own Purchase Orders");
      }
      // Vendors can only transition to accepted or cancelled
      if (status !== "accepted" && status !== "cancelled") {
        throw new BadRequestError(`Vendors are not allowed to transition PO to status: ${status}`);
      }
    } else {
      // Internal users must have po.approve permission (if not Procurement Manager)
      if (user.role !== "Procurement Manager") {
        const permission = await prisma.role_permissions.findFirst({
          where: {
            role_id: user.roleId,
            permissions: { resource: "po", action: "approve" },
          },
        });
        if (!permission) {
          throw new ForbiddenError("Insufficient permissions to perform approve on purchase orders");
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.purchase_orders.update({
        where: { id: poId },
        data: { status },
      });

      await AuditService.record(tx, {
        actorId: user.userId,
        organizationId,
        entityType: "purchase_orders",
        entityId: poId,
        action: "PO_STATUS_PATCHED",
        oldValue: { status: po.status },
        newValue: { status },
      });

      return updated;
    });
  }

  static async submitGoodsReceipt(
    actorId: string,
    organizationId: string,
    poId: string,
    userVendorId: string | null,
    data: {
      items: Array<{
        item_id: string;
        received_quantity: number;
      }>;
    }
  ) {
    // 1. Verify PO
    const po = await prisma.purchase_orders.findFirst({
      where: { id: poId, organization_id: organizationId, deleted_at: null },
      include: { purchase_order_items: { where: { deleted_at: null } } },
    });

    if (!po) {
      throw new NotFoundError("Purchase Order not found");
    }

    if (userVendorId && po.vendor_id !== userVendorId) {
      throw new ForbiddenError("Access denied: You can only register receipts for your own purchase orders");
    }

    // Must be in sent or accepted status
    if (po.status !== "sent" && po.status !== "accepted" && po.status !== "completed") {
      throw new BadRequestError(`Cannot submit receipts for PO in status: ${po.status}`);
    }

    return await prisma.$transaction(async (tx) => {
      const receiptLogItems = [];

      for (const item of data.items) {
        const dbItem = po.purchase_order_items.find((i) => i.id === item.item_id);
        if (!dbItem) {
          throw new NotFoundError(`PO Item ${item.item_id} not found in this Purchase Order`);
        }

        const currentReceived = Number(dbItem.received_quantity || 0);
        const newReceived = currentReceived + item.received_quantity;

        if (newReceived > Number(dbItem.quantity)) {
          throw new BadRequestError(
            `Cannot receive ${item.received_quantity} units. Total received (${newReceived}) would exceed ordered quantity (${dbItem.quantity})`
          );
        }

        // Update item quantity
        await tx.purchase_order_items.update({
          where: { id: item.item_id },
          data: { received_quantity: new Prisma.Decimal(newReceived) },
        });

        receiptLogItems.push({
          item_id: item.item_id,
          item_name: dbItem.item_name,
          received_now: item.received_quantity,
          total_received_so_far: newReceived,
        });
      }

      // Check if PO is now completely received
      const updatedItems = await tx.purchase_order_items.findMany({
        where: { purchase_order_id: poId, deleted_at: null },
      });
      const allFullyReceived = updatedItems.every((item) => Number(item.received_quantity) >= Number(item.quantity));

      if (allFullyReceived) {
        await tx.purchase_orders.update({
          where: { id: poId },
          data: { status: "completed" },
        });
      }

      // Record Goods Receipt inside Audit Log (this will represent the receipt history)
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "purchase_orders",
        entityId: poId,
        action: "GOODS_RECEIPT_SUBMITTED",
        newValue: { received_items: receiptLogItems, fully_received: allFullyReceived },
      });

      return {
        message: "Goods receipt processed successfully",
        fully_received: allFullyReceived,
        receipt: receiptLogItems,
      };
    });
  }

  static async getGoodsReceipts(organizationId: string | null, poId: string) {
    const logs = await prisma.activity_logs.findMany({
      where: {
        organization_id: organizationId,
        entity_type: "purchase_orders",
        entity_id: poId,
        action: "GOODS_RECEIPT_SUBMITTED",
      },
      orderBy: { created_at: "desc" },
      include: {
        users: {
          select: { first_name: true, last_name: true, email: true },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id.toString(),
      received_at: log.created_at,
      received_by: log.users ? `${log.users.first_name} ${log.users.last_name || ""}`.trim() : "System",
      details: log.new_value,
    }));
  }
}
