import { useMockDatabase } from '../store/mockDatabase';

// Simulated API calls with delay to mimic network latency
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const getMetrics = async () => {
  await delay(800);
  const state = useMockDatabase.getState();
  return {
    pendingApprovals: state.invoices.filter(i => i.status !== 'Paid').length,
    activeRFQs: state.rfqs.filter(r => r.status === 'Open').length,
    totalVendors: state.vendors.length,
    totalSpend: '$1.2M', // This could be calculated from paid invoices dynamically
  };
};

export const getSpendData = async () => {
  await delay(1000);
  return useMockDatabase.getState().spendData;
};

export const getVendors = async () => {
  await delay(1200);
  return useMockDatabase.getState().vendors;
};

export const createVendor = async (vendorData) => {
  await delay(1000);
  useMockDatabase.getState().addVendor(vendorData);
  return { success: true };
};

export const getRFQs = async () => {
  await delay(900);
  return useMockDatabase.getState().rfqs;
};

export const createRFQ = async (rfqData) => {
  await delay(1500);
  useMockDatabase.getState().addRFQ(rfqData);
  return { success: true };
};

export const getInvoices = async () => {
  await delay(700);
  return useMockDatabase.getState().invoices;
};

export const createInvoice = async (invoiceData) => {
  await delay(1200);
  useMockDatabase.getState().addInvoice(invoiceData);
  return { success: true };
};

export const getLogs = async () => {
  await delay(500);
  return useMockDatabase.getState().logs;
};

export const createQuotation = async (quotationData) => {
  await delay(1200);
  useMockDatabase.getState().addQuotation(quotationData);
  return { success: true };
};
