import React from 'react';
import { getPexGreenLogoDataUrl } from './brandLogoData';

interface ParamountLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full-vertical' | 'full-horizontal' | 'icon-only';
  bgDark?: boolean;
}

export const ParamountLogo: React.FC<ParamountLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full-vertical',
  bgDark = true,
}) => {
  const sizeMap = {
    sm: { width: 34, height: 56 },
    md: { width: 48, height: 80 },
    lg: { width: 68, height: 114 },
    xl: { width: 90, height: 152 },
  };

  const dim = sizeMap[size];

  if (variant === 'icon-only') {
    return (
      <svg
        viewBox="0 0 50 64"
        className={className}
        style={{ width: `${dim.width * 0.7}px`, height: `${dim.height * 0.7}px` }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cap */}
        <path
          d="M 23,4 C 23,4 32,4 32,13 L 18,13 C 18,13 18,10 21,10 L 23,10 Z"
          fill="#C6D92C"
        />
        {/* Walking Body */}
        <path
          d="M 19,16 L 31,16 L 31,32 L 35,46 L 24,62 L 18,62 L 28,47 L 25,35 L 12,46 L 5,42 L 19,25 Z"
          fill="#C6D92C"
        />
      </svg>
    );
  }

  if (variant === 'full-horizontal') {
    return (
      <div
        className={`inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-lg ${
          bgDark ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-900'
        } ${className}`}
      >
        <img
          src={getPexGreenLogoDataUrl()}
          alt="Paramount PEX Green Logo"
          className="h-8 w-auto object-contain rounded"
        />
        <div className="flex flex-col">
          <span className="font-bold tracking-tight text-sm uppercase text-[#C6D92C] font-sans">
            paramount
          </span>
          <span className="text-[9px] text-slate-400 font-medium tracking-wider uppercase">
            Procurement
          </span>
        </div>
      </div>
    );
  }

  // Default: full-vertical official PEX Green (2).png logo
  return (
    <div
      className={`relative inline-flex items-center justify-center p-0.5 rounded overflow-hidden select-none ${
        bgDark ? 'bg-[#22252A] border border-slate-800' : 'bg-transparent'
      } ${className}`}
      style={{ width: `${dim.width}px`, height: `${dim.height}px` }}
    >
      <img
        src={getPexGreenLogoDataUrl()}
        alt="Paramount PEX Green Logo"
        className="w-full h-full object-contain block select-none"
        draggable={false}
      />
    </div>
  );
};
