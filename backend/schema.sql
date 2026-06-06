-- ==============================================================================
-- VendorBridge ERP - Production PostgreSQL DDL
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================
CREATE TYPE vendor_status AS ENUM ('pending', 'active', 'blocked', 'rejected');
CREATE TYPE rfq_status AS ENUM ('draft','published','quotation_open','quotation_closed','under_review','approved','rejected','converted_to_po');
CREATE TYPE quotation_status AS ENUM ('draft','submitted','under_review','selected','rejected');
CREATE TYPE approval_status AS ENUM ('pending','approved','rejected');
CREATE TYPE po_status AS ENUM ('generated','sent','accepted','completed','cancelled');
CREATE TYPE invoice_status AS ENUM ('pending','sent','paid','overdue','cancelled');

-- =====================================================
-- 2. CORE INFRASTRUCTURE & AUTH
-- =====================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gst_number VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(30),
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id),
    currency VARCHAR(10) DEFAULT 'INR',
    tax_percentage NUMERIC(5,2) DEFAULT 18.00,
    po_terms_template TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(50) NOT NULL, -- e.g., 'rfq', 'vendor', 'invoice'
    action VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'approve'
    UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Internal Staff & Vendor Portal Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    role_id INT REFERENCES roles(id) NOT NULL,
    vendor_id UUID, -- Foreign key added below to avoid circular dependency
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(30),
    mfa_enabled BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- 3. SAAS INFRASTRUCTURE
-- =====================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events JSONB NOT NULL, -- e.g., ["po.created", "invoice.paid"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master sequence table for custom, gapless document numbering
CREATE TABLE document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    document_type VARCHAR(50) NOT NULL, -- 'RFQ', 'PO', 'INV'
    prefix VARCHAR(20) NOT NULL,
    next_value BIGINT DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, document_type)
);

-- =====================================================
-- 4. PROCUREMENT MASTER DATA
-- =====================================================
CREATE TABLE procurement_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    category_id UUID REFERENCES procurement_categories(id),
    company_name VARCHAR(255) NOT NULL,
    gst_number VARCHAR(50),
    contact_person VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    status vendor_status DEFAULT 'pending',
    rating NUMERIC(2,1) CHECK (rating BETWEEN 1 AND 5),
    onboarding_completed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE users ADD CONSTRAINT fk_user_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id);

-- =====================================================
-- 5. RFQ ENGINE
-- =====================================================
CREATE TABLE rfqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    rfq_number VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES procurement_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ NOT NULL,
    status rfq_status DEFAULT 'draft',
    currency VARCHAR(10) DEFAULT 'INR',
    total_estimated_amount NUMERIC(15,2),
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, rfq_number)
);

CREATE TABLE rfq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID REFERENCES rfqs(id),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'NOS',
    estimated_unit_price NUMERIC(15,2),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE rfq_vendors (
    rfq_id UUID REFERENCES rfqs(id),
    vendor_id UUID REFERENCES vendors(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (rfq_id, vendor_id)
);

CREATE TABLE rfq_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID REFERENCES rfqs(id),
    version_no INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. QUOTATION ENGINE
-- =====================================================
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    quotation_number VARCHAR(50) NOT NULL,
    rfq_id UUID REFERENCES rfqs(id),
    vendor_id UUID REFERENCES vendors(id),
    subtotal NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) NOT NULL,
    grand_total NUMERIC(15,2) NOT NULL,
    delivery_days INTEGER,
    valid_until TIMESTAMPTZ,
    notes TEXT,
    status quotation_status DEFAULT 'submitted',
    submitted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, quotation_number)
);

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES quotations(id),
    rfq_item_id UUID REFERENCES rfq_items(id),
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    delivery_days INTEGER,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE quotation_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES quotations(id),
    revision_no INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. GENERIC APPROVAL ENGINE
-- =====================================================
-- Polymorphic workflow capable of handling RFQs, Quotes, or POs
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    entity_type VARCHAR(50) NOT NULL, -- 'quotation', 'po', 'vendor'
    entity_id UUID NOT NULL,
    initiated_by UUID REFERENCES users(id),
    current_level INTEGER DEFAULT 1,
    status approval_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(entity_type, entity_id)
);

CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id),
    approver_id UUID REFERENCES users(id) NOT NULL,
    level_no INTEGER NOT NULL,
    status approval_status DEFAULT 'pending',
    remarks TEXT,
    action_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    UNIQUE(workflow_id, level_no)
);

-- =====================================================
-- 8. PROCUREMENT EXECUTION (POs & INVOICES)
-- =====================================================
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    po_number VARCHAR(50) NOT NULL,
    quotation_id UUID REFERENCES quotations(id),
    vendor_id UUID REFERENCES vendors(id),
    subtotal NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    status po_status DEFAULT 'generated',
    delivery_date DATE,
    shipping_address TEXT,
    billing_address TEXT,
    terms TEXT,
    generated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, po_number)
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    category_id UUID REFERENCES procurement_categories(id),
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    received_quantity NUMERIC(12,2) DEFAULT 0,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    invoice_number VARCHAR(50) NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    vendor_id UUID REFERENCES vendors(id),
    subtotal NUMERIC(15,2),
    cgst NUMERIC(15,2),
    sgst NUMERIC(15,2),
    igst NUMERIC(15,2),
    grand_total NUMERIC(15,2) NOT NULL,
    pdf_url TEXT,
    status invoice_status DEFAULT 'pending',
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, invoice_number)
);

CREATE TABLE invoice_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    recipient_email TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT
);

-- =====================================================
-- 9. COLLABORATION (POLYMORPHIC)
-- =====================================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. COMPLIANCE & AUDIT LOGGING
-- =====================================================
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    actor_user_id UUID REFERENCES users(id),
    ip_address VARCHAR(45),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutability enforcement
CREATE OR REPLACE FUNCTION prevent_log_modification() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Activity logs are strictly immutable for audit compliance.';
END; 
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_activity_log_update 
BEFORE UPDATE OR DELETE ON activity_logs 
FOR EACH ROW EXECUTE FUNCTION prevent_log_modification();

-- =====================================================
-- 11. ANALYTICS (MATERIALIZED VIEWS)
-- =====================================================
-- Generates fast aggregate data for the Dashboard (Screen 11)
CREATE MATERIALIZED VIEW vendor_performance_mv AS
SELECT 
    v.id AS vendor_id,
    v.organization_id,
    v.company_name,
    COUNT(DISTINCT r.id) AS total_rfqs_invited,
    COUNT(DISTINCT q.id) AS total_quotations_submitted,
    COUNT(DISTINCT po.id) AS total_pos_won,
    COALESCE(SUM(po.total_amount), 0) AS total_spend
FROM vendors v
LEFT JOIN rfq_vendors rv ON v.id = rv.vendor_id AND rv.deleted_at IS NULL
LEFT JOIN rfqs r ON rv.rfq_id = r.id AND r.deleted_at IS NULL
LEFT JOIN quotations q ON v.id = q.vendor_id AND q.deleted_at IS NULL
LEFT JOIN purchase_orders po ON v.id = po.vendor_id AND po.deleted_at IS NULL
WHERE v.deleted_at IS NULL
GROUP BY v.id, v.organization_id, v.company_name;

CREATE UNIQUE INDEX idx_vendor_performance_mv_id ON vendor_performance_mv(vendor_id);

-- =====================================================
-- 12. UTILITY FUNCTIONS & TRIGGERS
-- =====================================================
-- Function to handle automated updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to core mutable tables
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_vendors BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_rfqs BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_quotations BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_pos BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_invoices BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Sequence Generator for Documents (Tenant Aware)
CREATE OR REPLACE FUNCTION generate_document_number(org_id UUID, doc_type VARCHAR) 
RETURNS VARCHAR AS $$
DECLARE
    seq_prefix VARCHAR;
    next_num BIGINT;
    doc_number VARCHAR;
BEGIN
    UPDATE document_sequences 
    SET next_value = next_value + 1 
    WHERE organization_id = org_id AND document_type = doc_type
    RETURNING prefix, next_value - 1 INTO seq_prefix, next_num;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sequence not configured for document type %', doc_type;
    END IF;
    
    doc_number := seq_prefix || '-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(next_num::text, 4, '0');
    RETURN doc_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. INDEXING (Optimized for Soft Deletes & Polymorphism)
-- =====================================================
CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_org ON vendors(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_rfqs_org_status ON rfqs(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_org_status ON quotations(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pos_org_status ON purchase_orders(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_org_status ON invoices(organization_id, status) WHERE deleted_at IS NULL;

-- Polymorphic query optimizations
CREATE INDEX idx_approval_workflows_entity ON approval_workflows(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_logs_org_created ON activity_logs(organization_id, created_at DESC);