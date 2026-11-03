import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface PaidStampProps {
  date: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PaidStamp: React.FC<PaidStampProps> = ({
  date,
  size = 'md',
  className = '',
}) => {
  const isSm = size === 'sm';
  return (
    <div
      className={`inline-flex flex-col items-center justify-center border-2 border-emerald-600 rounded-2xl bg-emerald-50/95 text-emerald-800 shadow-md transform -rotate-10 select-none pointer-events-none transition-transform hover:scale-105 ${
        isSm ? 'px-2.5 py-1' : 'px-3.5 sm:px-4 py-1.5'
      } ${className}`}
      style={{
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.22)',
      }}
    >
      <div className="flex items-center gap-1.5 font-black tracking-wide text-emerald-800 leading-tight">
        <CheckCircle2
          className={`${isSm ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-600 shrink-0 stroke-[2.75]`}
        />
        <span className={`${isSm ? 'text-xs' : 'text-xs sm:text-sm'} font-black whitespace-nowrap`}>
          ငွေရှင်းပြီး (PAID)
        </span>
      </div>
      <div
        className={`${
          isSm ? 'text-[8.5px]' : 'text-[9.5px]'
        } font-mono font-bold tracking-wider text-emerald-700 uppercase mt-0.5`}
      >
        VERIFIED: {date}
      </div>
    </div>
  );
};
