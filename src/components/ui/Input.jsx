import { forwardRef } from 'react';

export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={ref}
        className={`px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] transition-colors ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
