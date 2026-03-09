import React from "react";

interface IconProps {
  className?: string;
}

export const AppleCalendarIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="18" rx="3" fill="#FF3B30" />
    <rect x="2" y="9" width="20" height="13" rx="0" fill="white" />
    <rect x="6" y="1" width="2" height="5" rx="1" fill="#6B7280" />
    <rect x="16" y="1" width="2" height="5" rx="1" fill="#6B7280" />
    <text x="12" y="19" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1C1C1E">17</text>
  </svg>
);

export const GoogleCalendarIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 2H6C3.79 2 2 3.79 2 6v12c0 2.21 1.79 4 4 4h12c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4z" fill="#fff" />
    <path d="M18 2h-4v6.5l3.25-3.25L18 2z" fill="#EA4335" />
    <path d="M22 6v-0c0-2.21-1.79-4-4-4h0l-3.25 3.25L18 8.5H22V6z" fill="#FBBC04" />
    <path d="M18 8.5H22v7H18V8.5z" fill="#34A853" />
    <path d="M6 22h12c2.21 0 4-1.79 4-4v0h-4l-3.25-3.25L14 18v4H6z" fill="#4285F4" />
    <path d="M2 15.5v2.5c0 2.21 1.79 4 4 4h0v-4l3.25-3.25L6 11.5H2v4z" fill="#34A853" />
    <path d="M2 6v5.5h4V8.25L6 2C3.79 2 2 3.79 2 6z" fill="#188038" />
    <path d="M6 2v6.5h4.75L14 5.25V2H6z" fill="#1967D2" />
    <rect x="6" y="8.5" width="12" height="7" rx="0" fill="white" fillOpacity="0.85" />
    <line x1="8" y1="11" x2="16" y2="11" stroke="#70757A" strokeWidth="1" />
    <line x1="8" y1="13.5" x2="14" y2="13.5" stroke="#70757A" strokeWidth="1" />
  </svg>
);

export const OutlookCalendarIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="18" rx="3" fill="#0078D4" />
    <rect x="2" y="9" width="20" height="13" rx="0" fill="white" />
    <rect x="6" y="1" width="2" height="5" rx="1" fill="#6B7280" />
    <rect x="16" y="1" width="2" height="5" rx="1" fill="#6B7280" />
    <rect x="5" y="11" width="3" height="2.5" rx="0.5" fill="#0078D4" opacity="0.2" />
    <rect x="10" y="11" width="3" height="2.5" rx="0.5" fill="#0078D4" opacity="0.2" />
    <rect x="15" y="11" width="3" height="2.5" rx="0.5" fill="#0078D4" opacity="0.2" />
    <rect x="5" y="15" width="3" height="2.5" rx="0.5" fill="#0078D4" opacity="0.4" />
    <rect x="10" y="15" width="3" height="2.5" rx="0.5" fill="#0078D4" opacity="0.2" />
  </svg>
);
