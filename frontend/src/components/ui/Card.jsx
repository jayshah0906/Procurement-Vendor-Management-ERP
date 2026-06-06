export const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, action, className = '' }) => {
  return (
    <div className={`px-6 py-5 border-b border-gray-100 flex items-center justify-between ${className}`}>
      <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
};

export const CardContent = ({ children, className = '' }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};
