export const Skeleton = ({ className = '', variant = 'rectangular' }) => {
  const variants = {
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    text: 'rounded-sm'
  };
  
  return (
    <div className={`animate-pulse bg-gray-200 ${variants[variant]} ${className}`}></div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full">
      <div className="h-10 bg-gray-100 rounded-t-lg border-b border-gray-200 w-full mb-2"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
};
