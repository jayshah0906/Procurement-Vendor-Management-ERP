// Simulated API Data for development before backend integration

export const mockVendors = [
  { id: 'V-1001', name: 'Tech Supplies Inc.', category: 'Electronics', status: 'Active', gst: 'GSTIN123456789' },
  { id: 'V-1002', name: 'Office Chairs LLC', category: 'Furniture', status: 'Pending', gst: 'GSTIN987654321' },
  { id: 'V-1003', name: 'Global Logistics', category: 'Shipping', status: 'Active', gst: 'GSTIN567890123' },
  { id: 'V-1004', name: 'Paper & Pens Co.', category: 'Stationery', status: 'Inactive', gst: 'GSTIN345678901' },
  { id: 'V-1005', name: 'Cloud Server Providers', category: 'IT Services', status: 'Active', gst: 'GSTIN789012345' },
];

export const mockRFQs = [
  { id: 'RFQ-2026-001', title: 'New Laptops for Engineering', deadline: '2026-06-15', status: 'Open', bids: 3 },
  { id: 'RFQ-2026-002', title: 'Q3 Office Stationery', deadline: '2026-06-20', status: 'Draft', bids: 0 },
  { id: 'RFQ-2026-003', title: 'Cloud Infrastructure Upgrade', deadline: '2026-06-10', status: 'Closed', bids: 5 },
];

export const mockMetrics = {
  pendingApprovals: 12,
  activeRFQs: 34,
  totalVendors: 156,
  totalSpend: '$1.2M',
};

export const mockSpendData = [
  { name: 'Jan', spend: 4000 },
  { name: 'Feb', spend: 3000 },
  { name: 'Mar', spend: 2000 },
  { name: 'Apr', spend: 2780 },
  { name: 'May', spend: 1890 },
  { name: 'Jun', spend: 2390 },
];

export const mockInvoices = [
  { id: 'INV-2026-101', vendor: 'Global Electronics', amount: '$42,500.00', status: 'Pending Payment', dueDate: '2026-06-30' },
  { id: 'INV-2026-102', vendor: 'Tech Supplies Inc.', amount: '$1,250.00', status: 'Paid', dueDate: '2026-06-15' },
  { id: 'INV-2026-103', vendor: 'Office Solutions', amount: '$8,400.00', status: 'Overdue', dueDate: '2026-06-01' },
];

export const mockLogs = [
  { id: 1, action: 'Purchase Order Generated', entity: 'PO-2026-045', user: 'System', time: '10 mins ago', color: 'bg-green-100 text-green-600' },
  { id: 2, action: 'RFQ Approved', entity: 'RFQ-2026-001', user: 'John Doe (Director)', time: '1 hour ago', color: 'bg-blue-100 text-blue-600' },
  { id: 3, action: 'New Quotation Submitted', entity: 'Global Electronics', user: 'Vendor Portal', time: '3 hours ago', color: 'bg-purple-100 text-purple-600' },
  { id: 4, action: 'Vendor Registered', entity: 'Office Chairs LLC', user: 'Jane Smith (Procurement)', time: '1 day ago', color: 'bg-yellow-100 text-yellow-600' },
];
