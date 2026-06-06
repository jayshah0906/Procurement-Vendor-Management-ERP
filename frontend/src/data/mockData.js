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
