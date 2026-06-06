import { Link } from 'react-router-dom';
import { WarningCircle, ArrowLeft } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <WarningCircle size={80} className="text-[var(--color-royal-blue)] mb-6 opacity-80" weight="duotone" />
      <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">404</h1>
      <h2 className="text-2xl font-bold text-gray-700 mb-3">Page not found</h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8">
        Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or perhaps the URL is incorrect.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft size={18} className="mr-2" /> Go Back
        </Button>
        <Link to="/erp/dashboard">
          <Button variant="primary">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
