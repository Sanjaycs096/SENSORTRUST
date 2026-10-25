import React, { useState } from 'react';

interface CopyDigestProps {
  value: string;
  truncateLength?: number;
  label?: string;
  className?: string;
  showIconOnly?: boolean;
}

export const CopyDigest: React.FC<CopyDigestProps> = ({
  value,
  truncateLength,
  label,
  className = '',
  showIconOnly = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const displayValue = truncateLength && value.length > truncateLength
    ? `${value.substring(0, Math.floor(truncateLength / 2))}...${value.substring(value.length - Math.floor(truncateLength / 2))}`
    : value;

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      {label && <span className="text-stone-500 text-[11px] font-sans">{label}</span>}
      {!showIconOnly && (
        <span
          className="text-stone-700 bg-stone-100 hover:bg-stone-200/80 px-1.5 py-0.5 rounded text-[11px] select-all cursor-pointer transition border border-stone-200/60"
          onClick={handleCopy}
          title={`Click to copy: ${value}`}
        >
          {displayValue}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition inline-flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700"
      >
        <span className={`material-symbols-outlined text-[14px] ${copied ? 'text-emerald-700' : ''}`}>
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
      {copied && (
        <span className="text-[10px] text-emerald-800 font-sans font-medium animate-fade-in">
          Copied!
        </span>
      )}
    </div>
  );
};
