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
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
      <div className="rounded-full bg-rose-500/20 p-3 text-rose-400">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-rose-300">{title}</h4>
      <p className="mt-1 max-w-md text-xs text-rose-400/80">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};

export default ErrorState;
