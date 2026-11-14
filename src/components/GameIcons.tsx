import React from 'react';

export const TitleEmblemSvg: React.FC<{ className?: string; theme?: 'dark' | 'light' }> = ({
  className,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  return (
    <svg
      viewBox="0 0 520 130"
      className={className}
      role="img"
      aria-label="Santa's Christmas Delivery"
    >
      <defs>
        <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isLight ? '#b45309' : '#fde68a'} />
          <stop offset="50%" stopColor={isLight ? '#d97706' : '#f59e0b'} />
          <stop offset="100%" stopColor={isLight ? '#92400e' : '#fde68a'} />
        </linearGradient>
      </defs>
      <text
        x="20"
        y="58"
        fill={isLight ? '#0f172a' : '#ffffff'}
        fontFamily="Fraunces, Georgia, serif"
        fontSize="54"
        fontWeight="800"
      >
        Santa&apos;s Christmas
      </text>
      <text
        x="22"
        y="114"
        fill="url(#goldRibbon)"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="50"
        fontWeight="800"
      >
        Delivery
      </text>
    </svg>
  );
};

export const CookieIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#d97706" stroke="#091224" strokeWidth="2" />
    <circle cx="9" cy="9" r="1.6" fill="#451a03" />
    <circle cx="15" cy="10" r="1.5" fill="#451a03" />
    <circle cx="11" cy="15" r="1.7" fill="#451a03" />
    <circle cx="15.5" cy="15" r="1.2" fill="#451a03" />
  </svg>
);

export const PresentIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="4" y="8" width="16" height="13" rx="2" fill="#dc2626" stroke="#091224" strokeWidth="2" />
    <rect x="3" y="6" width="18" height="4" rx="1" fill="#ef4444" stroke="#091224" strokeWidth="2" />
    <rect x="10.5" y="6" width="3" height="15" fill="#fbbf24" />
    <path d="M12 6 C9 2, 6 4, 8.5 6 Z" fill="#fde047" stroke="#091224" strokeWidth="1.5" />
    <path d="M12 6 C15 2, 18 4, 15.5 6 Z" fill="#fde047" stroke="#091224" strokeWidth="1.5" />
  </svg>
);

export const KeyIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="8" cy="12" r="4.5" fill="#fbbf24" stroke="#091224" strokeWidth="2" />
    <circle cx="8" cy="12" r="1.5" fill="#091224" />
    <path d="M12.5 12 H21 V15.5 M17.5 12 V14.5" stroke="#fbbf24" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

export const PortalIcon: React.FC<{ unlocked: boolean; className?: string }> = ({
  unlocked,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      fill={unlocked ? '#10b981' : '#334155'}
      stroke="#091224"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="5" fill={unlocked ? '#fef08a' : '#64748b'} />
  </svg>
);

export const CoinIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#fbbf24" stroke="#091224" strokeWidth="2" />
    <circle cx="12" cy="12" r="6" fill="none" stroke="#b45309" strokeWidth="1.5" />
    <path d="M12 8 V16 M9.5 10.5 H14.5" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const StarIcon: React.FC<{ filled: boolean; className?: string }> = ({
  filled,
  className = 'w-6 h-6',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M12 2.5 L14.9 8.4 L21.4 9.3 L16.7 13.9 L17.8 20.4 L12 17.3 L6.2 20.4 L7.3 13.9 L2.6 9.3 L9.1 8.4 Z"
      fill={filled ? '#fbbf24' : '#334155'}
      stroke="#091224"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);
