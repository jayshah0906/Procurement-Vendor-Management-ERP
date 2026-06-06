import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database cleanup and fresh seed...");

  // 1. Truncate all tables to give a fresh start (CASCADE cleans up dependent records)
  const tables = [
    "activity_logs",
    "api_keys",
    "approval_steps",
    "approval_workflows",
    "attachments",
    "comments",
    "document_sequences",
    "invoice_email_logs",
    "invoices",
    "notifications",
    "organization_settings",
    "organizations",
    "permissions",
    "procurement_categories",
    "purchase_order_items",
    "purchase_orders",
    "quotation_items",
    "quotation_revisions",
    "quotations",
    "rfq_items",
    "rfq_revisions",
    "rfq_vendors",
    "rfqs",
    "role_permissions",
    "roles",
    "users",
    "vendors",
    "webhook_endpoints",
  ];

  console.log("🧹 Truncating all tables...");
  const truncateQuery = `TRUNCATE TABLE ${tables.map(t => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(truncateQuery);
  console.log("✅ Database truncated successfully!");

  // 2. Create Organization
  const orgId = "d4b8f537-8f5c-4be5-94be-d1b9d4e5e4fa";
  console.log("🏢 Seeding Organization...");
  const org = await prisma.organizations.create({
    data: {
      id: orgId,
      name: "VendorBridge ERP Demo Org",
      gst_number: "29AAACC1234B1Z5",
      email: "info@vendorbridge.com",
      phone: "1234567890",
      address: "Bangalore, India",
    },
  });

  // 3. Create Organization Settings
  await prisma.organization_settings.create({
    data: {
      organization_id: org.id,
      currency: "INR",
      tax_percentage: "18.00",
      po_terms_template: "Standard Payment terms: 30 days net.",
    },
  });

  // 4. Create document sequences
  const documentTypes = ["RFQ", "PO", "INV"];
  for (const docType of documentTypes) {
    await prisma.document_sequences.create({
      data: {
        organization_id: org.id,
        document_type: docType,
        prefix: docType,
        next_value: 1000n,
      },
    });
  }

  // 5. Define Roles
  console.log("👥 Seeding Roles...");
  const rolesData = [
    { id: 1, name: "Procurement Manager", description: "Manager with full authorization" },
    { id: 2, name: "Procurement Officer", description: "Officer who manages RFQs and POs" },
    { id: 3, name: "Vendor", description: "External vendor user access" },
    { id: 4, name: "Approver", description: "Approver for quotation and PO workflows" },
  ];

  for (const role of rolesData) {
    await prisma.roles.create({
      data: role,
    });
  }

  // 6. Define Permissions
  console.log("🔑 Seeding Permissions...");
  const permissionsData = [
    // RFQ Permissions
    { resource: "rfq", action: "create" },
    { resource: "rfq", action: "view" },
    { resource: "rfq", action: "update" },
    { resource: "rfq", action: "publish" },
    { resource: "rfq", action: "invite" },
    // Quotation Permissions
    { resource: "quotation", action: "create" },
    { resource: "quotation", action: "view" },
    { resource: "quotation", action: "submit" },
    { resource: "quotation", action: "approve" },
    // PO Permissions
    { resource: "po", action: "create" },
    { resource: "po", action: "view" },
    { resource: "po", action: "receipt" },
    { resource: "po", action: "approve" },
    // Invoice Permissions
    { resource: "invoice", action: "create" },
    { resource: "invoice", action: "view" },
    { resource: "invoice", action: "pay" },
    { resource: "invoice", action: "approve" },
    // Vendor Permissions
    { resource: "vendor", action: "create" },
    { resource: "vendor", action: "view" },
    { resource: "vendor", action: "approve" },
    { resource: "vendor", action: "blacklist" },
    // Role & User CRUD (admin only)
    { resource: "role", action: "view" },
    { resource: "role", action: "create" },
    { resource: "role", action: "update" },
    { resource: "role", action: "delete" },
    { resource: "user", action: "create" },
    { resource: "user", action: "view" },
    { resource: "user", action: "update" },
  ];

  const dbPermissions = [];
  for (const perm of permissionsData) {
    const dbPerm = await prisma.permissions.create({
      data: perm,
    });
    dbPermissions.push(dbPerm);
  }

  // 7. Map Role Permissions
  console.log("🗺️ Mapping Role Permissions...");
  // Procurement Manager: gets all permissions
  for (const perm of dbPermissions) {
    await prisma.role_permissions.create({
      data: { role_id: 1, permission_id: perm.id },
    });
  }

  // Procurement Officer: all except approve, blacklist, publish, pay, role, user management
  const officerPerms = dbPermissions.filter(p => 
    !(p.action === "approve" || p.action === "blacklist" || p.action === "publish" || p.action === "pay" || p.resource === "role" || p.resource === "user")
  );
  for (const perm of officerPerms) {
    await prisma.role_permissions.create({
      data: { role_id: 2, permission_id: perm.id },
    });
  }

  // Vendor permissions
  const vendorPerms = dbPermissions.filter(p => 
    (p.resource === "rfq" && p.action === "view") ||
    (p.resource === "quotation" && ["create", "view", "submit"].includes(p.action)) ||
    (p.resource === "po" && p.action === "view") ||
    (p.resource === "invoice" && ["create", "view"].includes(p.action))
  );
  for (const perm of vendorPerms) {
    await prisma.role_permissions.create({
      data: { role_id: 3, permission_id: perm.id },
    });
  }

  // Approver permissions
  const approverPerms = dbPermissions.filter(p => 
    p.action === "approve" || p.action === "view"
  );
  for (const perm of approverPerms) {
    await prisma.role_permissions.create({
      data: { role_id: 4, permission_id: perm.id },
    });
  }

  // 8. Create Procurement Categories
  console.log("🏷️ Seeding Procurement Categories...");
  const catElectronicsId = "e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
  const catOfficeSuppliesId = "f2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e";
  const catRawMaterialsId = "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d";
  const catFurnitureId = "f2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7f";
  const catLogisticsId = "f2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d70";

  const categories = [
    { id: catElectronicsId, organization_id: org.id, name: "IT Hardware", description: "Laptops, servers, peripherals" },
    { id: catOfficeSuppliesId, organization_id: org.id, name: "Stationery", description: "Stationery, desks, chairs" },
    { id: catRawMaterialsId, organization_id: org.id, name: "Raw Materials", description: "Metal parts, components, wiring" },
    { id: catFurnitureId, organization_id: org.id, name: "Furniture", description: "Desks, office chairs, tables" },
    { id: catLogisticsId, organization_id: org.id, name: "Logistics", description: "Courier and transport services" },
  ];

  for (const cat of categories) {
    await prisma.procurement_categories.create({
      data: cat,
    });
  }

  // 9. Create Users (Procurement Team & Approvers)
  console.log("👤 Seeding Users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  const managerId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
  const officerId = "b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e";
  const approver1Id = "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f";
  const approver2Id = "d4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a";

  const staffUsers = [
    {
      id: managerId,
      organization_id: org.id,
      role_id: 1, // Procurement Manager
      first_name: "Amit",
      last_name: "Sharma",
      email: "admin@company.com",
      password_hash: passwordHash,
      phone: "9876543210",
      is_active: true,
    },
    {
      id: officerId,
      organization_id: org.id,
      role_id: 2, // Procurement Officer
      first_name: "Rajesh",
      last_name: "Kumar",
      email: "officer@company.com",
      password_hash: passwordHash,
      phone: "9887766554",
      is_active: true,
    },
    {
      id: approver1Id,
      organization_id: org.id,
      role_id: 4, // Approver
      first_name: "Suresh",
      last_name: "Prasad",
      email: "approver1@company.com",
      password_hash: passwordHash,
      phone: "9123456789",
      is_active: true,
    },
    {
      id: approver2Id,
      organization_id: org.id,
      role_id: 4, // Approver
      first_name: "Priya",
      last_name: "Verma",
      email: "approver2@company.com",
      password_hash: passwordHash,
      phone: "9112233445",
      is_active: true,
    },
  ];

  for (const u of staffUsers) {
    await prisma.users.create({
      data: u,
    });
  }

  // 10. Create Vendors
  console.log("🏭 Seeding Vendors...");
  const vendorApexId = "262e8d2d-ef87-42a6-a489-266c272d90cd";
  const vendorOfficeId = "dc252dee-a9da-46c8-b1a2-b9623f60d849";
  const vendorTechCoreId = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d";
  const vendorInfraSuppliesId = "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e";
  const vendorFastLogId = "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f";

  await prisma.vendors.create({
    data: {
      id: vendorApexId,
      organization_id: org.id,
      category_id: catElectronicsId,
      company_name: "Apex Technology",
      gst_number: "29APEXTECH1234Z",
      contact_person: "Jane Smith",
      email: "vendor@apex.com",
      phone: "+91 9900112233",
      address: "IT Park Phase 2, Bangalore",
      status: "active",
      rating: "4.8",
      onboarding_completed: true,
      created_by: managerId,
    },
  });

  await prisma.vendors.create({
    data: {
      id: vendorOfficeId,
      organization_id: org.id,
      category_id: catOfficeSuppliesId,
      company_name: "Office Essentials Ltd",
      gst_number: "29OFFICES1234Y",
      contact_person: "John Doe",
      email: "sales@officeessentials.com",
      phone: "+91 9988776655",
      address: "Commercial Market, Mumbai",
      status: "pending",
      rating: "4.2",
      onboarding_completed: false,
      created_by: managerId,
    },
  });

  await prisma.vendors.create({
    data: {
      id: vendorTechCoreId,
      organization_id: org.id,
      category_id: catElectronicsId,
      company_name: "TechCore Ltd",
      gst_number: "29TCHCORE1234A",
      contact_person: "Steve Jobs",
      email: "steve@techcore.com",
      phone: "+91 9900113344",
      address: "Silicon Valley, Bangalore",
      status: "active",
      rating: "4.7",
      onboarding_completed: true,
      created_by: managerId,
    },
  });

  await prisma.vendors.create({
    data: {
      id: vendorInfraSuppliesId,
      organization_id: org.id,
      category_id: catFurnitureId,
      company_name: "Infra Supplies",
      gst_number: "29INFRAS1234B",
      contact_person: "Bob Builder",
      email: "bob@infrasupplies.com",
      phone: "+91 9900114455",
      address: "Industrial Area, Pune",
      status: "active",
      rating: "4.5",
      onboarding_completed: true,
      created_by: managerId,
    },
  });

  await prisma.vendors.create({
    data: {
      id: vendorFastLogId,
      organization_id: org.id,
      category_id: catLogisticsId,
      company_name: "FastLog",
      gst_number: "29FASTLOG1234C",
      contact_person: "Barry Allen",
      email: "barry@fastlog.com",
      phone: "+91 9900115566",
      address: "Logistics Hub, Chennai",
      status: "active",
      rating: "4.6",
      onboarding_completed: true,
      created_by: managerId,
    },
  });

  // Seed 24 active dummy vendors to match the 28 active vendors count
  console.log("🏭 Seeding 24 dummy active vendors...");
  for (let i = 1; i <= 24; i++) {
    await prisma.vendors.create({
      data: {
        organization_id: org.id,
        category_id: catOfficeSuppliesId,
        company_name: `Dummy Vendor ${i}`,
        gst_number: `29DUMMYV${1000 + i}Z`,
        contact_person: `Contact Person ${i}`,
        email: `vendor${i}@dummy.com`,
        phone: `+91 9900000${10 + i}`,
        address: `Address ${i}, City`,
        status: "active",
        rating: "4.0",
        onboarding_completed: true,
        created_by: managerId,
      },
    });
  }

  // 11. Create Vendor User (linked to Apex Technology)
  console.log("👤 Seeding Vendor User...");
  const vendorUserId = "e5f67a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b";
  await prisma.users.create({
    data: {
      id: vendorUserId,
      organization_id: org.id,
      role_id: 3, // Vendor
      vendor_id: vendorApexId,
      first_name: "Jane",
      last_name: "Smith",
      email: "vendor@apex.com",
      password_hash: passwordHash,
      phone: "9900112233",
      is_active: true,
    },
  });

  // 12. Create RFQ
  console.log("📝 Seeding RFQs...");
  const rfqId = "b293cb5a-2a38-4145-b1a6-e4f53c82cb9d";
  const rfqItemId = "c394db6b-3b49-5256-c2b7-f5f64d93dc0e";

  await prisma.rfqs.create({
    data: {
      id: rfqId,
      organization_id: org.id,
      rfq_number: "RFQ-2026-1001",
      category_id: catElectronicsId,
      title: "Annual Laptop Procurement 2026",
      description: "Procurement of 50 business laptops for developers",
      deadline: new Date("2026-07-31T23:59:59Z"),
      status: "published",
      currency: "INR",
      total_estimated_amount: "3000000.00",
      created_by: officerId,
    },
  });

  // 13. Create RFQ Item
  await prisma.rfq_items.create({
    data: {
      id: rfqItemId,
      rfq_id: rfqId,
      item_name: "Developer Laptops (Core i7, 32GB RAM, 1TB SSD)",
      description: "Must support standard dual screen output and Docker virtualisation",
      quantity: "50.00",
      unit: "NOS",
      estimated_unit_price: "60000.00",
    },
  });

  // 14. Create RFQ Vendor link (Apex Technology invited)
  await prisma.rfq_vendors.create({
    data: {
      rfq_id: rfqId,
      vendor_id: vendorApexId,
      invited_at: new Date(),
    },
  });

  // 15. Create Quotation submitted by Apex Technology
  console.log("📄 Seeding Quotations...");
  const quotationId = "78d14ad8-4b07-4034-ba02-fa28ab94d63f";
  const quotationItemId = "89e25be9-4c18-6367-d3c8-0a1b2c3d4e5f";

  await prisma.quotations.create({
    data: {
      id: quotationId,
      organization_id: org.id,
      quotation_number: "QT-2026-1001",
      rfq_id: rfqId,
      vendor_id: vendorApexId,
      subtotal: "2750000.00",
      tax_amount: "495000.00",
      grand_total: "3245000.00",
      delivery_days: 14,
      valid_until: new Date("2026-08-31T23:59:59Z"),
      notes: "Offering 5% bulk discount on laptops. Standard warranty: 3 years.",
      status: "selected",
      submitted_at: new Date(),
      created_by: vendorUserId,
    },
  });

  // 16. Create Quotation Item
  await prisma.quotation_items.create({
    data: {
      id: quotationItemId,
      quotation_id: quotationId,
      rfq_item_id: rfqItemId,
      item_name: "Developer Laptops (Core i7, 32GB RAM, 1TB SSD)",
      quantity: "50.00",
      unit_price: "55000.00", // Discounted unit price
      total_price: "2750000.00",
      delivery_days: 14,
    },
  });

  // 17. Create Quotation Revision (snapshot logs)
  await prisma.quotation_revisions.create({
    data: {
      id: "9af36cf0-5d29-7478-e4d9-1b2c3d4e5f6a",
      quotation_id: quotationId,
      revision_no: 1,
      snapshot: {
        subtotal: 2750000.00,
        tax_amount: 495000.00,
        grand_total: 3245000.00,
        items: [
          {
            item_name: "Developer Laptops (Core i7, 32GB RAM, 1TB SSD)",
            quantity: 50.00,
            unit_price: 55000.00,
            total_price: 2750000.00,
          }
        ]
      },
      created_by: vendorUserId,
    },
  });

  // 18. Create Approval Workflow
  console.log("📈 Seeding Approval Workflows...");
  const workflowId = "43d37cd8-3608-4a41-a76a-8b8e68124835";
  await prisma.approval_workflows.create({
    data: {
      id: workflowId,
      organization_id: org.id,
      entity_type: "quotation",
      entity_id: quotationId,
      initiated_by: managerId,
      current_level: 2,
      status: "approved",
    },
  });

  // 19. Create Approval Steps
  await prisma.approval_steps.create({
    data: {
      id: "54e48de9-4719-5b52-b88b-9c9f7a23c946",
      workflow_id: workflowId,
      approver_id: approver1Id,
      level_no: 1,
      status: "approved",
      remarks: "Price fits our budget. Approved.",
      action_at: new Date(),
    },
  });

  await prisma.approval_steps.create({
    data: {
      id: "65f59ef0-582a-6c63-c99c-ad0a8b34da57",
      workflow_id: workflowId,
      approver_id: approver2Id,
      level_no: 2,
      status: "approved",
      remarks: "Final check looks fine. Proceed to generate PO.",
      action_at: new Date(),
    },
  });

  // 20. Create Purchase Order
  console.log("📦 Seeding Purchase Orders...");
  const poId = "2273eda7-2813-48f6-838c-d1a9e0b2fb90";
  const poItemId = "3384fdb8-3924-5907-a00d-e2b2fb0cb911";

  await prisma.purchase_orders.create({
    data: {
      id: poId,
      organization_id: org.id,
      po_number: "PO-202606-1010",
      quotation_id: quotationId,
      vendor_id: vendorApexId,
      subtotal: "2750000.00",
      tax_amount: "495000.00",
      total_amount: "3245000.00",
      status: "accepted",
      delivery_date: new Date("2026-08-30T00:00:00Z"),
      shipping_address: "Tech Hub Office, Block A, Bangalore",
      billing_address: "Finance Dept, Block B, Bangalore",
      terms: "Net 30 days payout",
      generated_by: managerId,
    },
  });

  // 21. Create Purchase Order Item
  await prisma.purchase_order_items.create({
    data: {
      id: poItemId,
      purchase_order_id: poId,
      category_id: catElectronicsId,
      item_name: "Developer Laptops (Core i7, 32GB RAM, 1TB SSD)",
      quantity: "50.00",
      unit_price: "55000.00",
      total_price: "2750000.00",
      received_quantity: "50.00", // Fully received
    },
  });

  // 22. Create Invoice
  console.log("📄 Seeding Invoices...");
  const invoiceId = "1172dca6-1803-38f5-728b-c0a9e0b1fb80";
  await prisma.invoices.create({
    data: {
      id: invoiceId,
      organization_id: org.id,
      invoice_number: "INV-202606-1008",
      purchase_order_id: poId,
      vendor_id: vendorApexId,
      subtotal: "2750000.00",
      cgst: "0.00",
      sgst: "495000.00",
      igst: "0.00",
      grand_total: "3245000.00",
      pdf_url: "http://localhost:5000/uploads/INV-202606-1008.pdf",
      status: "paid",
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sent_at: new Date(),
      paid_at: new Date(),
    },
  });

  // 23. Create Invoice Email Log
  await prisma.invoice_email_logs.create({
    data: {
      id: "0061cba5-0792-27e4-617a-b9a8d0a0fa70",
      invoice_id: invoiceId,
      recipient_email: "accounts@company.com",
      status: "sent",
    },
  });

  // 24. Create Comments
  console.log("💬 Seeding Comments...");
  await prisma.comments.create({
    data: {
      id: "3456789a-bcde-f012-3456-789abcdef012",
      organization_id: org.id,
      entity_type: "purchase_orders",
      entity_id: poId,
      user_id: managerId,
      comment: "Deliverables verified. Payment processed for developer laptops.",
    },
  });

  // 25. Create Attachments
  console.log("📎 Seeding Attachments...");
  await prisma.attachments.create({
    data: {
      id: "456789ab-cdef-0123-4567-89abcdef0123",
      organization_id: org.id,
      entity_type: "purchase_orders",
      entity_id: poId,
      file_name: "laptop-deliverables-receipt.pdf",
      file_url: "http://localhost:5000/uploads/laptop-deliverables-receipt.pdf",
      file_size_bytes: 102400n,
      mime_type: "application/pdf",
      uploaded_by: managerId,
    },
  });

  // 26. Create Notifications
  console.log("🔔 Seeding Notifications...");
  await prisma.notifications.create({
    data: {
      id: "12345678-abcd-ef01-2345-6789abcdef01",
      user_id: managerId,
      title: "New Quotation Received",
      message: "Apex Technology has submitted QT-2026-1001 for RFQ-2026-1001.",
      is_read: false,
      related_entity_type: "quotation",
      related_entity_id: quotationId,
    },
  });

  // 27. Create API Keys
  console.log("🔑 Seeding API Keys...");
  await prisma.api_keys.create({
    data: {
      id: "789abcde-0123-4567-89ab-cdef01234567",
      organization_id: org.id,
      name: "Procurement Analytics Key",
      key_hash: "sha256-mock-hash-key-for-procurement-integration-2026",
      expires_at: new Date("2027-12-31T23:59:59Z"),
    },
  });

  // 28. Create Webhook Endpoints
  console.log("⚓ Seeding Webhooks...");
  await prisma.webhook_endpoints.create({
    data: {
      id: "bcdef012-3456-789a-bcde-f0123456789a",
      organization_id: org.id,
      url: "https://webhooks.company.com/procurement",
      secret: "whsec_mocksecretkeyforwebhooks123456789",
      events: ["po.created", "po.status_updated"],
      is_active: true,
    },
  });

  // 29. Create Activity Logs
  console.log("🕒 Seeding Activity Logs...");
  await prisma.activity_logs.create({
    data: {
      organization_id: org.id,
      actor_user_id: managerId,
      ip_address: "192.168.1.50",
      entity_type: "purchase_orders",
      entity_id: poId,
      action: "PO_GENERATED",
      old_value: {},
      new_value: { status: "generated" },
    },
  });

  await prisma.activity_logs.create({
    data: {
      organization_id: org.id,
      actor_user_id: vendorUserId,
      ip_address: "103.45.67.12",
      entity_type: "purchase_orders",
      entity_id: poId,
      action: "PO_STATUS_PATCHED",
      old_value: { status: "generated" },
      new_value: { status: "accepted" },
    },
  });

  console.log("📦 Seeding extra Purchase Orders for reporting...");
  
  // TechCore Ltd POs (₹4,20,000 spend in May 2026, 6 POs total)
  const techCorePOData = [
    { amount: 220000, date: new Date("2026-05-10T12:00:00Z"), status: "completed" },
    { amount: 200000, date: new Date("2026-05-15T12:00:00Z"), status: "completed" },
    { amount: 60000,  date: new Date("2026-04-10T12:00:00Z"), status: "completed" },
    { amount: 50000,  date: new Date("2026-03-15T12:00:00Z"), status: "completed" },
    { amount: 80000,  date: new Date("2026-02-20T12:00:00Z"), status: "completed" },
    { amount: 70000,  date: new Date("2026-01-25T12:00:00Z"), status: "completed" },
  ];

  for (let i = 0; i < techCorePOData.length; i++) {
    const poData = techCorePOData[i];
    const poNumber = `PO-TECH-${2000 + i}`;
    const pOrder = await prisma.purchase_orders.create({
      data: {
        organization_id: org.id,
        po_number: poNumber,
        vendor_id: vendorTechCoreId,
        subtotal: poData.amount / 1.18,
        tax_amount: (poData.amount / 1.18) * 0.18,
        total_amount: poData.amount,
        status: poData.status as any,
        delivery_date: poData.date,
        created_at: poData.date,
        generated_by: managerId,
        shipping_address: "Tech Hub, Bangalore",
        billing_address: "Finance Dept, Bangalore",
      }
    });

    await prisma.purchase_order_items.create({
      data: {
        purchase_order_id: pOrder.id,
        category_id: catElectronicsId,
        item_name: "Hardware Equipment & Services",
        quantity: 1,
        unit_price: poData.amount / 1.18,
        total_price: poData.amount,
        received_quantity: poData.status === "completed" ? 1 : 0,
      }
    });

    await prisma.invoices.create({
      data: {
        organization_id: org.id,
        invoice_number: `INV-TECH-${2000 + i}`,
        purchase_order_id: pOrder.id,
        vendor_id: vendorTechCoreId,
        subtotal: poData.amount / 1.18,
        grand_total: poData.amount,
        status: "paid",
        invoice_date: poData.date,
        due_date: new Date(poData.date.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    });
  }

  // Infra Supplies POs (₹3,10,000 spend in May 2026, 4 POs total)
  const infraPOData = [
    { amount: 310000, date: new Date("2026-05-12T12:00:00Z"), status: "completed" },
    { amount: 100000, date: new Date("2026-04-18T12:00:00Z"), status: "completed" },
    { amount: 120000, date: new Date("2026-03-22T12:00:00Z"), status: "completed" },
    { amount: 90000,  date: new Date("2026-02-14T12:00:00Z"), status: "completed" },
  ];

  for (let i = 0; i < infraPOData.length; i++) {
    const poData = infraPOData[i];
    const poNumber = `PO-INFRA-${3000 + i}`;
    const pOrder = await prisma.purchase_orders.create({
      data: {
        organization_id: org.id,
        po_number: poNumber,
        vendor_id: vendorInfraSuppliesId,
        subtotal: poData.amount / 1.18,
        tax_amount: (poData.amount / 1.18) * 0.18,
        total_amount: poData.amount,
        status: poData.status as any,
        delivery_date: poData.date,
        created_at: poData.date,
        generated_by: managerId,
        shipping_address: "Admin Block, Bangalore",
        billing_address: "Finance Dept, Bangalore",
      }
    });

    await prisma.purchase_order_items.create({
      data: {
        purchase_order_id: pOrder.id,
        category_id: catFurnitureId,
        item_name: "Office Furniture Set",
        quantity: 1,
        unit_price: poData.amount / 1.18,
        total_price: poData.amount,
        received_quantity: poData.status === "completed" ? 1 : 0,
      }
    });

    await prisma.invoices.create({
      data: {
        organization_id: org.id,
        invoice_number: `INV-INFRA-${3000 + i}`,
        purchase_order_id: pOrder.id,
        vendor_id: vendorInfraSuppliesId,
        subtotal: poData.amount / 1.18,
        grand_total: poData.amount,
        status: "paid",
        invoice_date: poData.date,
        due_date: new Date(poData.date.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    });
  }

  // FastLog POs (₹1,90,000 spend in May 2026, 3 POs total)
  const fastLogPOData = [
    { amount: 190000, date: new Date("2026-05-20T12:00:00Z"), status: "completed" },
    { amount: 80000,  date: new Date("2026-04-25T12:00:00Z"), status: "completed" },
    { amount: 90000,  date: new Date("2026-03-30T12:00:00Z"), status: "completed" },
  ];

  for (let i = 0; i < fastLogPOData.length; i++) {
    const poData = fastLogPOData[i];
    const poNumber = `PO-FAST-${4000 + i}`;
    const pOrder = await prisma.purchase_orders.create({
      data: {
        organization_id: org.id,
        po_number: poNumber,
        vendor_id: vendorFastLogId,
        subtotal: poData.amount / 1.18,
        tax_amount: (poData.amount / 1.18) * 0.18,
        total_amount: poData.amount,
        status: poData.status as any,
        delivery_date: poData.date,
        created_at: poData.date,
        generated_by: managerId,
        shipping_address: "Warehouse 1, Bangalore",
        billing_address: "Finance Dept, Bangalore",
      }
    });

    await prisma.purchase_order_items.create({
      data: {
        purchase_order_id: pOrder.id,
        category_id: catLogisticsId,
        item_name: "Logistics and Shipping Services",
        quantity: 1,
        unit_price: poData.amount / 1.18,
        total_price: poData.amount,
        received_quantity: poData.status === "completed" ? 1 : 0,
      }
    });

    await prisma.invoices.create({
      data: {
        organization_id: org.id,
        invoice_number: `INV-FAST-${4000 + i}`,
        purchase_order_id: pOrder.id,
        vendor_id: vendorFastLogId,
        subtotal: poData.amount / 1.18,
        grand_total: poData.amount,
        status: "paid",
        invoice_date: poData.date,
        due_date: new Date(poData.date.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    });
  }

  // Office Essentials POs
  const officePOData = [
    { amount: 210000, date: new Date("2026-05-08T12:00:00Z"), status: "completed" },
    { amount: 150000, date: new Date("2026-04-05T12:00:00Z"), status: "completed" },
    { amount: 90000,  date: new Date("2025-12-15T12:00:00Z"), status: "completed" },
  ];

  for (let i = 0; i < officePOData.length; i++) {
    const poData = officePOData[i];
    const poNumber = `PO-OFFICE-${5000 + i}`;
    const pOrder = await prisma.purchase_orders.create({
      data: {
        organization_id: org.id,
        po_number: poNumber,
        vendor_id: vendorOfficeId,
        subtotal: poData.amount / 1.18,
        tax_amount: (poData.amount / 1.18) * 0.18,
        total_amount: poData.amount,
        status: poData.status as any,
        delivery_date: poData.date,
        created_at: poData.date,
        generated_by: managerId,
        shipping_address: "HQ Office, Bangalore",
        billing_address: "Finance Dept, Bangalore",
      }
    });

    await prisma.purchase_order_items.create({
      data: {
        purchase_order_id: pOrder.id,
        category_id: catOfficeSuppliesId,
        item_name: "Consumable Stationery Items",
        quantity: 1,
        unit_price: poData.amount / 1.18,
        total_price: poData.amount,
        received_quantity: poData.status === "completed" ? 1 : 0,
      }
    });

    await prisma.invoices.create({
      data: {
        organization_id: org.id,
        invoice_number: `INV-OFFICE-${5000 + i}`,
        purchase_order_id: pOrder.id,
        vendor_id: vendorOfficeId,
        subtotal: poData.amount / 1.18,
        grand_total: poData.amount,
        status: "paid",
        invoice_date: poData.date,
        due_date: new Date(poData.date.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    });
  }

  console.log("📄 Seeding 3 Overdue Invoices...");
  const overdueInvoices = [
    { number: "INV-OVERDUE-1", amount: 15000, vendorId: vendorTechCoreId },
    { number: "INV-OVERDUE-2", amount: 25000, vendorId: vendorInfraSuppliesId },
    { number: "INV-OVERDUE-3", amount: 35000, vendorId: vendorFastLogId },
  ];

  for (const inv of overdueInvoices) {
    await prisma.invoices.create({
      data: {
        organization_id: org.id,
        invoice_number: inv.number,
        vendor_id: inv.vendorId,
        subtotal: inv.amount / 1.18,
        grand_total: inv.amount,
        status: "pending",
        invoice_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Due 15 days ago
      }
    });
  }

  console.log("=========================================================");
  console.log("🎉 DATABASE RESTARTED AND SEEDED SUCCESSFULLY! 🎉");
  console.log("=========================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
