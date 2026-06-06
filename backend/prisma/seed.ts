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
  console.log("Seeding database...");

  // 1. Create Organization
  const org = await prisma.organizations.upsert({
    where: { id: "d4b8f537-8f5c-4be5-94be-d1b9d4e5e4fa" },
    update: {},
    create: {
      id: "d4b8f537-8f5c-4be5-94be-d1b9d4e5e4fa",
      name: "VendorBridge ERP Demo Org",
      gst_number: "29AAACC1234B1Z5",
      email: "info@vendorbridge.com",
      phone: "1234567890",
      address: "Bangalore, India",
    },
  });

  // 2. Create Organization Settings
  await prisma.organization_settings.upsert({
    where: { organization_id: org.id },
    update: {},
    create: {
      organization_id: org.id,
      currency: "INR",
      tax_percentage: 18.00,
      po_terms_template: "Standard Payment terms: 30 days net.",
    },
  });

  // 3. Create document sequences
  const documentTypes = ["RFQ", "PO", "INV"];
  for (const docType of documentTypes) {
    await prisma.document_sequences.upsert({
      where: {
        organization_id_document_type: {
          organization_id: org.id,
          document_type: docType,
        },
      },
      update: {},
      create: {
        organization_id: org.id,
        document_type: docType,
        prefix: docType,
        next_value: 1000,
      },
    });
  }

  // 4. Define Roles
  const rolesData = [
    { id: 1, name: "Procurement Manager", description: "Manager with full authorization" },
    { id: 2, name: "Procurement Officer", description: "Officer who manages RFQs and POs" },
    { id: 3, name: "Vendor", description: "External vendor user access" },
    { id: 4, name: "Approver", description: "Approver for quotation and PO workflows" },
  ];

  for (const role of rolesData) {
    await prisma.roles.upsert({
      where: { id: role.id },
      update: { description: role.description },
      create: role,
    });
  }

  // 5. Define Permissions
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
  ];

  const dbPermissions = [];
  for (const perm of permissionsData) {
    const dbPerm = await prisma.permissions.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    });
    dbPermissions.push(dbPerm);
  }

  // 6. Map Role Permissions
  // Procurement Manager gets all permissions
  const managerRole = await prisma.roles.findUnique({ where: { name: "Procurement Manager" } });
  if (managerRole) {
    for (const perm of dbPermissions) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: managerRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: managerRole.id, permission_id: perm.id },
      });
    }
  }

  // Procurement Officer permissions (no approve/blacklist/publish)
  const officerRole = await prisma.roles.findUnique({ where: { name: "Procurement Officer" } });
  if (officerRole) {
    const officerPerms = dbPermissions.filter(p => 
      !(p.action === "approve" || p.action === "blacklist" || p.action === "publish" || p.action === "pay")
    );
    for (const perm of officerPerms) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: officerRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: officerRole.id, permission_id: perm.id },
      });
    }
  }

  // Vendor permissions
  const vendorRole = await prisma.roles.findUnique({ where: { name: "Vendor" } });
  if (vendorRole) {
    const vendorPerms = dbPermissions.filter(p => 
      (p.resource === "rfq" && p.action === "view") ||
      (p.resource === "quotation" && ["create", "view", "submit"].includes(p.action)) ||
      (p.resource === "po" && p.action === "view") ||
      (p.resource === "invoice" && ["create", "view"].includes(p.action))
    );
    for (const perm of vendorPerms) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: vendorRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: vendorRole.id, permission_id: perm.id },
      });
    }
  }

  // Approver permissions
  const approverRole = await prisma.roles.findUnique({ where: { name: "Approver" } });
  if (approverRole) {
    const approverPerms = dbPermissions.filter(p => 
      p.action === "approve" || p.action === "view"
    );
    for (const perm of approverPerms) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: approverRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: approverRole.id, permission_id: perm.id },
      });
    }
  }

  // 7. Create Seed Users
  const passwordHash = await bcrypt.hash("password123", 10);

  // Manager User
  await prisma.users.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      organization_id: org.id,
      role_id: managerRole!.id,
      first_name: "Amit",
      last_name: "Sharma",
      email: "admin@company.com",
      password_hash: passwordHash,
      phone: "9876543210",
      is_active: true,
    },
  });

  // Officer User
  await prisma.users.upsert({
    where: { email: "officer@company.com" },
    update: {},
    create: {
      id: "b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e",
      organization_id: org.id,
      role_id: officerRole!.id,
      first_name: "Rajesh",
      last_name: "Kumar",
      email: "officer@company.com",
      password_hash: passwordHash,
      phone: "9887766554",
      is_active: true,
    },
  });

  // Approvers
  await prisma.users.upsert({
    where: { email: "approver1@company.com" },
    update: {},
    create: {
      id: "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
      organization_id: org.id,
      role_id: approverRole!.id,
      first_name: "Suresh",
      last_name: "Prasad",
      email: "approver1@company.com",
      password_hash: passwordHash,
      phone: "9123456789",
      is_active: true,
    },
  });

  await prisma.users.upsert({
    where: { email: "approver2@company.com" },
    update: {},
    create: {
      id: "d4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
      organization_id: org.id,
      role_id: approverRole!.id,
      first_name: "Priya",
      last_name: "Verma",
      email: "approver2@company.com",
      password_hash: passwordHash,
      phone: "9112233445",
      is_active: true,
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
