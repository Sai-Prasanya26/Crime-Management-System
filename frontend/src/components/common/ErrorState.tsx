import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load intelligence data',
  message = 'An error occurred while connecting to the backend API service.',
  onRetry,
}) => {
  return (
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border border-red-200 bg-[#FEF2F2] p-8 text-center">
      <div className="rounded-full bg-red-100 p-3 text-[#B91C1C]">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-[#B91C1C]">{title}</h4>
      <p className="mt-1 max-w-md text-xs text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#B91C1C] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};

export default ErrorState;
