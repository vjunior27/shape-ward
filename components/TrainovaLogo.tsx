import { FC } from 'react';

interface TrainovaLogoProps {
  variant?: 'full' | 'icon' | 'inline';
  lang?: 'pt' | 'en';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ECG_PATH = `M-72 0
  L-40 0
  C-38 0 -38 -20 -36 -20 L-30 -20 C-28 -20 -28 0 -26 0
  L-22 0
  C-20 0 -20 -18 -18 -18 C-16 -18 -16 -10 -14 -10 C-12 -10 -14 -18 -12 -18 C-10 -18 -10 0 -8 0
  L-4 0
  C-2 0 0 -24 2 -24 C4 -24 6 0 8 0 C8 -8 8 -12 10 -12
  L12 0
  L16 0
  C18 0 18 -18 20 -18 C22 -18 22 0 22 0
  L26 0
  C28 0 28 -18 30 -18 C32 -18 32 -8 34 -8 C36 -8 34 -18 36 -18 C38 -18 38 0 40 0
  L72 0`;

const slogans = {
  pt: 'FORJE SEU CORPO COM PRECISÃO DE IA',
  en: 'FORGE YOUR BODY WITH AI PRECISION',
};

const sizes = {
  sm: { scale: 0.6, fontSize: 20, sloganSize: 7, gap: 18 },
  md: { scale: 0.85, fontSize: 30, sloganSize: 10, gap: 24 },
  lg: { scale: 1.1, fontSize: 40, sloganSize: 13, gap: 52 },
};

export const TrainovaLogo: FC<TrainovaLogoProps> = ({
  variant = 'full',
  lang = 'pt',
  size = 'md',
  className = '',
}) => {
  const s = sizes[size];

  if (variant === 'icon') {
    return (
      <svg viewBox="0 0 512 512" className={className} aria-label="Trainova">
        <rect width="512" height="512" rx="112" fill="#0a0a0f"/>
        <g transform="translate(256, 256)">
          <rect x="-108" y="-42" width="18" height="84" rx="6" fill="#12121a" stroke="#00FF94" strokeWidth="2.6"/>
          <rect x="-86" y="-30" width="12" height="60" rx="4" fill="#12121a" stroke="#00FF94" strokeWidth="2.6"/>
          <path d="M-70 0 L-40 0 C-38 0 -38 -22 -36 -22 L-30 -22 C-28 -22 -28 0 -26 0 L-22 0 C-20 0 -20 -20 -18 -20 C-16 -20 -16 -11 -14 -11 C-12 -11 -14 -20 -12 -20 C-10 -20 -10 0 -8 0 L-4 0 C-2 0 0 -28 2 -28 C4 -28 6 0 8 0 C8 -9 8 -14 10 -14 L12 0 L16 0 C18 0 18 -20 20 -20 C22 -20 22 0 22 0 L26 0 C28 0 28 -20 30 -20 C32 -20 32 -9 34 -9 C36 -9 34 -20 36 -20 C38 -20 38 0 40 0 L70 0"
                fill="none" stroke="#00FF94" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="74" y="-30" width="12" height="60" rx="4" fill="#12121a" stroke="#00FF94" strokeWidth="2.6"/>
          <rect x="90" y="-42" width="18" height="84" rx="6" fill="#12121a" stroke="#00FF94" strokeWidth="2.6"/>
        </g>
      </svg>
    );
  }

  if (variant === 'inline') {
    return (
      <svg viewBox="0 0 280 40" className={className} aria-label="Trainova">
        <g transform="translate(18, 20) scale(0.35)">
          <rect x="-108" y="-36" width="16" height="72" rx="5" fill="none" stroke="#00FF94" strokeWidth="3.2"/>
          <rect x="-88" y="-26" width="12" height="52" rx="4" fill="none" stroke="#00FF94" strokeWidth="3.2"/>
          <path d={ECG_PATH} fill="none" stroke="#00FF94" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="76" y="-26" width="12" height="52" rx="4" fill="none" stroke="#00FF94" strokeWidth="3.2"/>
          <rect x="92" y="-36" width="16" height="72" rx="5" fill="none" stroke="#00FF94" strokeWidth="3.2"/>
        </g>
        <text x="68" y="26" textAnchor="start"
              fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
              fontSize="18" fontWeight="500" fill="#FAFAFA" letterSpacing="3">TRAINOVA</text>
      </svg>
    );
  }

  const width = 400;
  const height = 110 + s.gap + s.fontSize + s.sloganSize + 20;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-label="Trainova">
      <g transform={`translate(${width / 2}, 70) scale(${s.scale})`}>
        <rect x="-108" y="-36" width="16" height="72" rx="5" fill="#12121a" stroke="#00FF94" strokeWidth="2"/>
        <rect x="-88" y="-26" width="12" height="52" rx="4" fill="#12121a" stroke="#00FF94" strokeWidth="2"/>
        <path d={ECG_PATH} fill="none" stroke="#00FF94" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="76" y="-26" width="12" height="52" rx="4" fill="#12121a" stroke="#00FF94" strokeWidth="2"/>
        <rect x="92" y="-36" width="16" height="72" rx="5" fill="#12121a" stroke="#00FF94" strokeWidth="2"/>
      </g>
      <text x={width / 2} y={110 + s.gap} textAnchor="middle"
            fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
            fontSize={s.fontSize} fontWeight="500" fill="#FAFAFA" letterSpacing="6">TRAINOVA</text>
      <text x={width / 2} y={110 + s.gap + s.fontSize + 6} textAnchor="middle"
            fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
            fontSize={s.sloganSize} fontWeight="400" fill="#00cc76" letterSpacing="3">{slogans[lang]}</text>
    </svg>
  );
};

export default TrainovaLogo;
