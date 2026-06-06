import React from 'react';

/**
 * Reusable, crash-safe error banner component.
 * Safely parses backend validation errors and details.
 */
export const ApiErrorBanner = ({ error, fallback = 'An unexpected error occurred.' }) => {
  if (!error) return null;

  let message = fallback;
  let details = null;

  if (error.response?.data) {
    const data = error.response.data;
    const apiError = data.error;

    if (apiError) {
      if (typeof apiError === 'string') {
        message = apiError;
      } else {
        message = apiError.message || message;
        details = apiError.details;
      }
    } else if (data.message) {
      message = data.message;
    }
  } else if (error.message) {
    message = error.message;
  }

  return (
    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm space-y-1">
      <div className="font-semibold">{message}</div>
      {Array.isArray(details) && details.length > 0 && (
        <ul className="list-disc list-inside text-xs mt-1.5 space-y-0.5 opacity-90 pl-1">
          {details.map((d, i) => (
            <li key={i}>
              <span className="font-semibold capitalize">
                {(d.field || 'Field').replace('_', ' ')}
              </span>
              : {d.message || 'Required'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
