// src/components/NWSLogo.tsx
import React from 'react';

export default function NWSLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 120 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="nws-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2EBAC6" />
          <stop offset="50%" stopColor="#43C9B2" />
          <stop offset="100%" stopColor="#62D5A0" />
        </linearGradient>
      </defs>
      <path
        d="M32 12C18.7452 12 8 20.0589 8 30C8 39.9411 18.7452 48 32 48C45.2548 48 54 36 60 30C66 24 74.7452 12 88 12C101.255 12 112 20.0589 112 30C112 39.9411 101.255 48 88 48C74.7452 48 66 36 60 30C54 24 45.2548 12 32 12Z"
        stroke="url(#nws-grad)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}