import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockVendors, mockRFQs, mockInvoices, mockSpendData, mockLogs } from '../data/mockData';

// We use Zustand to simulate a database. The data will persist in localStorage so the user can refresh the page and keep their data.
export const useMockDatabase = create(
  persist(
    (set) => ({
      vendors: mockVendors,
      rfqs: mockRFQs,
      invoices: mockInvoices,
      spendData: mockSpendData,
      logs: mockLogs,

      // Operations
      addVendor: (vendor) => set((state) => ({ 
        vendors: [{ id: `V-${1000 + state.vendors.length + 1}`, ...vendor, status: 'Pending' }, ...state.vendors],
        logs: [{ id: Date.now(), action: 'Vendor Registered', entity: vendor.name, user: 'System', time: 'Just now', color: 'bg-yellow-100 text-yellow-600' }, ...state.logs]
      })),

      addRFQ: (rfq) => set((state) => ({ 
        rfqs: [{ id: `RFQ-2026-00${state.rfqs.length + 1}`, status: 'Open', bids: 0, ...rfq }, ...state.rfqs],
        logs: [{ id: Date.now(), action: 'RFQ Created', entity: rfq.title, user: 'System', time: 'Just now', color: 'bg-blue-100 text-blue-600' }, ...state.logs]
      })),

      addQuotation: (quotation) => set((state) => ({
        logs: [{ id: Date.now(), action: 'Quotation Submitted', entity: `For ${quotation.rfqId}`, user: 'System', time: 'Just now', color: 'bg-purple-100 text-purple-600' }, ...state.logs]
      })),

      addInvoice: (invoice) => set((state) => ({ 
        invoices: [{ id: `INV-2026-${100 + state.invoices.length + 1}`, status: 'Pending Payment', ...invoice }, ...state.invoices],
        logs: [{ id: Date.now(), action: 'Invoice Generated', entity: invoice.vendor, user: 'System', time: 'Just now', color: 'bg-green-100 text-green-600' }, ...state.logs]
      })),

      approveInvoice: (id) => set((state) => ({
        invoices: state.invoices.map(inv => inv.id === id ? { ...inv, status: 'Paid' } : inv),
        logs: [{ id: Date.now(), action: 'Invoice Paid', entity: id, user: 'System', time: 'Just now', color: 'bg-green-100 text-green-600' }, ...state.logs]
      })),

      resetDatabase: () => set({
        vendors: mockVendors,
        rfqs: mockRFQs,
        invoices: mockInvoices,
        spendData: mockSpendData,
        logs: mockLogs,
      })
    }),
    {
      name: 'vendorbridge-mock-db',
    }
  )
);
