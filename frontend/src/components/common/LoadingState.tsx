import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading live crime intelligence...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  return (
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center p-8 text-center">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[#4F46E5]`} />
      <p className="mt-4 text-sm font-semibold text-[#0F172A]">{message}</p>
      <p className="mt-1 text-xs text-[#64748B]">Retrieving operational intelligence records...</p>
    </div>
  );
};

export default LoadingState;
