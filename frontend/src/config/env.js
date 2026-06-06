/**
 * Environment configuration module.
 * Safely exports validated environment variables.
 */

export const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1',
};
