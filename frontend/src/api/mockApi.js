// Mock API Imports would go here if needed
import { mockVendors, mockMetrics, mockSpendData, mockRFQs } from '../data/mockData';

// Simulated API calls with delay
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const getMetrics = async () => {
  await delay(800);
  return mockMetrics;
};

export const getSpendData = async () => {
  await delay(1000);
  return mockSpendData;
};

export const getVendors = async () => {
  await delay(1200);
  return mockVendors;
};

export const getRFQs = async () => {
  await delay(900);
  return mockRFQs;
};
