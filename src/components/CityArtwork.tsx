import React from 'react';
import { CityDefinition } from '../game/types';

interface CityArtworkProps {
  city: CityDefinition;
  unlocked: boolean;
}

export const CityArtwork: React.FC<CityArtworkProps> = ({ city, unlocked }) => {
  const { palette, id } = city;
  const gradId = `sky-${id}`;
  const glowId = `glow-${id}`;

  const renderWeather = () => {
    if (id === 'north-pole' || id === 'moscow') {
      return (
        <g opacity="0.55">
          <path
            d="M-10 38 Q70 12 145 34 T330 24 L330 56 Q220 42 145 58 T-10 56 Z"
            fill="#34d399"
          />
          <path
            d="M10 26 Q110 4 195 28 T330 16 L330 38 Q220 28 155 40 T10 42 Z"
            fill="#38bdf8"
            opacity="0.65"
          />
        </g>
      );
    }
    if (palette.weather === 'gold_spark') {
      return (
        <g strokeWidth="1.6" strokeLinecap="round">
          <g transform="translate(62 28)" stroke="#fde047">
            <line x1="0" y1="-10" x2="0" y2="-4" />
            <line x1="0" y1="4" x2="0" y2="10" />
            <line x1="-10" y1="0" x2="-4" y2="0" />
            <line x1="4" y1="0" x2="10" y2="0" />
            <line x1="-7" y1="-7" x2="-3" y2="-3" />
            <line x1="3" y1="3" x2="7" y2="7" />
            <line x1="7" y1="-7" x2="3" y2="-3" />
            <line x1="-3" y1="3" x2="-7" y2="7" />
          </g>
          <g transform="translate(262 24)" stroke="#f43f5e">
            <line x1="0" y1="-9" x2="0" y2="-3" />
            <line x1="0" y1="3" x2="0" y2="9" />
            <line x1="-9" y1="0" x2="-3" y2="0" />
            <line x1="3" y1="0" x2="9" y2="0" />
            <line x1="-6" y1="-6" x2="-2" y2="-2" />
            <line x1="2" y1="2" x2="6" y2="6" />
            <line x1="6" y1="-6" x2="2" y2="-2" />
            <line x1="-2" y1="2" x2="-6" y2="6" />
          </g>
        </g>
      );
    }
    if (palette.weather === 'petals') {
      return (
        <g fill="#fbcfe8" opacity="0.85">
          <ellipse cx="38" cy="24" rx="3" ry="1.6" transform="rotate(25 38 24)" />
          <ellipse cx="96" cy="18" rx="3" ry="1.6" transform="rotate(-15 96 18)" />
          <ellipse cx="172" cy="26" rx="2.8" ry="1.5" transform="rotate(30 172 26)" />
          <ellipse cx="268" cy="20" rx="3" ry="1.6" transform="rotate(-25 268 20)" />
        </g>
      );
    }
    if (palette.weather === 'neon_rain') {
      return (
        <g stroke={palette.particleColor} strokeWidth="1.4" opacity="0.6" strokeLinecap="round">
          <line x1="42" y1="16" x2="36" y2="28" />
          <line x1="112" y1="12" x2="106" y2="24" />
          <line x1="214" y1="18" x2="208" y2="30" />
          <line x1="282" y1="14" x2="276" y2="26" />
        </g>
      );
    }
    return (
      <g fill="#ffffff" opacity="0.82">
        <circle cx="34" cy="22" r="1.4" />
        <circle cx="78" cy="14" r="1.8" />
        <circle cx="118" cy="30" r="1.3" />
        <circle cx="164" cy="16" r="1.6" />
        <circle cx="206" cy="28" r="1.2" />
        <circle cx="248" cy="15" r="1.8" />
        <circle cx="288" cy="26" r="1.5" />
        <circle cx="54" cy="48" r="1.3" />
        <circle cx="272" cy="52" r="1.4" />
      </g>
    );
  };

  const renderLandmark = () => {
    switch (id) {
      case 'north-pole':
        return (
          <g>
            {/* Snowy mountains */}
            <polygon points="0,128 55,66 115,128" fill="#cbd5e1" opacity="0.45" />
            <polygon points="200,128 265,60 320,128" fill="#cbd5e1" opacity="0.45" />
            {/* Workshop Lodge */}
            <rect x="115" y="72" width="90" height="44" rx="4" fill="#991b1b" />
            <polygon points="106,74 160,34 214,74" fill="#f8fafc" />
            <polygon points="112,74 160,40 208,74" fill="#dc2626" />
            {/* Spire & Glowing Star */}
            <rect x="155" y="20" width="10" height="22" fill="#fbbf24" />
            <circle cx="160" cy="16" r="6" fill="#fef08a" />
            {/* Glowing Warm Windows */}
            <rect x="128" y="84" width="16" height="16" rx="3" fill="#fde047" />
            <rect x="176" y="84" width="16" height="16" rx="3" fill="#fde047" />
            <rect x="151" y="90" width="18" height="26" rx="9" fill="#451a03" />
            {/* Snow Pine Trees */}
            <polygon points="48,116 64,68 80,116" fill="#15803d" />
            <polygon points="54,84 64,68 74,84" fill="#ffffff" />
            <polygon points="240,116 256,64 272,116" fill="#166534" />
            <polygon points="246,80 256,64 266,80" fill="#ffffff" />
          </g>
        );
      case 'new-york':
        return (
          <g>
            {/* Midtown Skyline */}
            <rect x="18" y="54" width="26" height="62" fill="#1e293b" />
            <rect x="52" y="40" width="32" height="76" fill="#334155" />
            <rect x="220" y="44" width="34" height="72" fill="#334155" />
            <rect x="262" y="58" width="32" height="58" fill="#1e293b" />
            {/* Empire State Silhouette */}
            <rect x="92" y="46" width="28" height="70" fill="#475569" />
            <rect x="98" y="32" width="16" height="16" fill="#64748b" />
            <line x1="106" y1="14" x2="106" y2="32" stroke="#facc15" strokeWidth="2.5" />
            {/* Lit Skyline Windows */}
            <g fill="#fef08a" opacity="0.8">
              <rect x="58" y="48" width="5" height="6" />
              <rect x="70" y="48" width="5" height="6" />
              <rect x="58" y="60" width="5" height="6" />
              <rect x="228" y="54" width="6" height="6" />
              <rect x="240" y="64" width="6" height="6" />
            </g>
            {/* Rockefeller Christmas Tree */}
            <polygon points="160,30 132,88 188,88" fill="#15803d" />
            <polygon points="160,46 126,108 194,108" fill="#166534" />
            <rect x="155" y="106" width="10" height="12" fill="#78350f" />
            <circle cx="160" cy="27" r="5.5" fill="#fde047" />
            <circle cx="152" cy="64" r="2.6" fill="#f43f5e" />
            <circle cx="168" cy="76" r="2.6" fill="#38bdf8" />
            <circle cx="148" cy="92" r="2.8" fill="#fde047" />
            <circle cx="172" cy="96" r="2.8" fill="#f43f5e" />
          </g>
        );
      case 'london':
        return (
          <g>
            {/* Thames Bridge Silhouette */}
            <path d="M10 108 Q80 86 150 108" stroke="#64748b" strokeWidth="4" fill="none" />
            <rect x="24" y="62" width="16" height="54" fill="#334155" />
            <polygon points="22,62 32,46 42,62" fill="#475569" />
            {/* Big Ben Clock Tower */}
            <rect x="142" y="36" width="32" height="82" fill="#b45309" />
            <polygon points="138,36 158,12 178,36" fill="#1e293b" />
            <line x1="158" y1="6" x2="158" y2="14" stroke="#fde047" strokeWidth="2" />
            <circle cx="158" cy="54" r="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
            <line x1="158" y1="54" x2="158" y2="48" stroke="#1e293b" strokeWidth="1.8" />
            <line x1="158" y1="54" x2="163" y2="54" stroke="#1e293b" strokeWidth="1.8" />
            {/* Iconic Red Phone Box */}
            <rect x="228" y="72" width="22" height="44" rx="3" fill="#dc2626" />
            <rect x="232" y="79" width="14" height="16" fill="#bae6fd" opacity="0.85" />
            <circle cx="239" cy="69" r="3.5" fill="#fde047" />
          </g>
        );
      case 'tokyo':
        return (
          <g>
            {/* Mount Fuji */}
            <polygon points="62,116 142,40 222,116" fill="#334155" />
            <polygon points="118,63 142,40 166,63 156,67 148,60 140,67 130,61" fill="#ffffff" />
            {/* Traditional 5-Tier Pagoda */}
            <rect x="224" y="48" width="24" height="68" fill="#991b1b" />
            <polygon points="212,56 236,42 260,56" fill="#1e293b" />
            <polygon points="214,74 236,61 258,74" fill="#1e293b" />
            <polygon points="216,92 236,80 256,92" fill="#1e293b" />
            {/* Glowing Torii Gate */}
            <rect x="46" y="74" width="6" height="42" fill="#ef4444" />
            <rect x="82" y="74" width="6" height="42" fill="#ef4444" />
            <rect x="38" y="70" width="58" height="6" rx="2" fill="#dc2626" />
            <rect x="44" y="82" width="46" height="4" fill="#ef4444" />
            {/* Warm Paper Lanterns */}
            <circle cx="204" cy="84" r="5" fill="#fde047" />
            <circle cx="272" cy="84" r="5" fill="#fb7185" />
          </g>
        );
      case 'paris':
        return (
          <g>
            {/* Haussmann Rooftops */}
            <rect x="14" y="78" width="76" height="38" fill="#1e293b" />
            <rect x="230" y="76" width="74" height="40" fill="#1e293b" />
            <rect x="26" y="86" width="10" height="12" fill="#fde047" opacity="0.75" />
            <rect x="52" y="86" width="10" height="12" fill="#fde047" opacity="0.75" />
            <rect x="246" y="84" width="10" height="12" fill="#fde047" opacity="0.75" />
            {/* Eiffel Tower */}
            <polygon points="154,14 166,14 176,72 198,116 180,116 170,94 150,94 140,116 122,116 144,72" fill="#d97706" />
            <rect x="143" y="68" width="34" height="5" fill="#fbbf24" />
            <rect x="134" y="90" width="52" height="6" fill="#fbbf24" />
            <line x1="160" y1="6" x2="160" y2="16" stroke="#fef08a" strokeWidth="2.5" />
            <circle cx="160" cy="6" r="4" fill="#fef08a" />
            {/* Festive Sparkles along Tower */}
            <circle cx="160" cy="36" r="2.2" fill="#ffffff" />
            <circle cx="154" cy="54" r="2" fill="#fef08a" />
            <circle cx="166" cy="54" r="2" fill="#fef08a" />
          </g>
        );
      case 'cairo':
        return (
          <g>
            {/* Desert Dunes */}
            <path d="M0 112 Q80 96 170 110 T320 106 L320 128 L0 128 Z" fill="#b45309" opacity="0.55" />
            {/* Great Pyramids of Giza */}
            <polygon points="36,116 106,42 176,116" fill="#d97706" />
            <polygon points="106,42 176,116 128,116" fill="#92400e" opacity="0.55" />
            <polygon points="148,116 206,56 264,116" fill="#f59e0b" />
            <polygon points="206,56 264,116 220,116" fill="#b45309" opacity="0.55" />
            {/* Guiding North Star */}
            <circle cx="160" cy="24" r="6" fill="#fef08a" />
            <path d="M160 10 L162 22 L174 24 L162 26 L160 38 L158 26 L146 24 L158 22 Z" fill="#fde047" />
            {/* Festive Palm */}
            <path d="M276 116 Q272 90 278 74" stroke="#78350f" strokeWidth="5" fill="none" />
            <path d="M278 74 Q260 66 252 78" stroke="#16a34a" strokeWidth="4" fill="none" />
            <path d="M278 74 Q296 66 304 78" stroke="#16a34a" strokeWidth="4" fill="none" />
            <circle cx="264" cy="73" r="2.5" fill="#f43f5e" />
            <circle cx="290" cy="73" r="2.5" fill="#fde047" />
          </g>
        );
      case 'lagos':
        return (
          <g>
            {/* Shimmering Lagoon Water */}
            <rect x="0" y="96" width="320" height="32" fill="#0e7490" opacity="0.6" />
            <line x1="25" y1="106" x2="95" y2="106" stroke="#5eead4" strokeWidth="2" opacity="0.6" />
            <line x1="195" y1="112" x2="275" y2="112" stroke="#fde047" strokeWidth="2" opacity="0.6" />
            {/* Lekki-Ikoyi Cable Bridge */}
            <rect x="0" y="88" width="320" height="6" fill="#334155" />
            <polygon points="152,88 160,24 168,88" fill="#f8fafc" />
            <g stroke="#fde047" strokeWidth="1.4" opacity="0.85">
              <line x1="160" y1="30" x2="90" y2="88" />
              <line x1="160" y1="44" x2="115" y2="88" />
              <line x1="160" y1="30" x2="230" y2="88" />
              <line x1="160" y1="44" x2="205" y2="88" />
            </g>
            {/* Festive Palms */}
            <path d="M44 114 Q42 86 48 70" stroke="#78350f" strokeWidth="5" fill="none" />
            <path d="M48 70 Q32 62 24 72" stroke="#10b981" strokeWidth="4" fill="none" />
            <path d="M48 70 Q64 62 72 72" stroke="#10b981" strokeWidth="4" fill="none" />
            <circle cx="36" cy="68" r="2.6" fill="#fde047" />
            <circle cx="60" cy="68" r="2.6" fill="#f43f5e" />
          </g>
        );
      case 'rio':
        return (
          <g>
            {/* Guanabara Bay */}
            <rect x="0" y="98" width="320" height="30" fill="#0369a1" opacity="0.65" />
            {/* Sugarloaf & Corcovado */}
            <path d="M18 116 Q72 48 128 116 Z" fill="#14532d" />
            <path d="M150 116 Q216 42 284 116 Z" fill="#166534" />
            {/* Christ the Redeemer Silhouette on Peak */}
            <rect x="212" y="34" width="8" height="28" fill="#fef9c3" />
            <rect x="196" y="40" width="40" height="5" rx="2" fill="#fef9c3" />
            <circle cx="216" cy="30" r="4.5" fill="#fef9c3" />
            {/* Waterfront Festive Tree */}
            <polygon points="94,76 78,108 110,108" fill="#10b981" />
            <circle cx="94" cy="73" r="4" fill="#fde047" />
            <circle cx="88" cy="92" r="2.3" fill="#f43f5e" />
            <circle cx="100" cy="98" r="2.3" fill="#fde047" />
          </g>
        );
      case 'moscow':
        return (
          <g>
            {/* Kremlin Wall */}
            <rect x="16" y="92" width="288" height="24" fill="#991b1b" />
            {/* St. Basil's Colorful Onion Domes */}
            <rect x="104" y="64" width="24" height="32" fill="#f8fafc" />
            <path d="M100 64 Q116 32 132 64 Z" fill="#0284c7" />
            <rect x="144" y="46" width="32" height="50" fill="#fef3c7" />
            <polygon points="146,46 160,16 174,46" fill="#dc2626" />
            <circle cx="160" cy="14" r="4.5" fill="#fde047" />
            <rect x="192" y="64" width="24" height="32" fill="#f8fafc" />
            <path d="M188 64 Q204 32 220 64 Z" fill="#10b981" />
            <path d="M68 74 Q82 48 96 74 Z" fill="#f59e0b" />
            <rect x="72" y="74" width="20" height="20" fill="#fef3c7" />
            <path d="M226 74 Q240 48 254 74 Z" fill="#ec4899" />
            <rect x="230" y="74" width="20" height="20" fill="#fef3c7" />
          </g>
        );
      case 'sydney':
      default:
        return (
          <g>
            {/* Sydney Harbour Water */}
            <rect x="0" y="96" width="320" height="32" fill="#0369a1" opacity="0.68" />
            {/* Harbour Bridge Arch */}
            <path d="M12 96 Q90 34 168 96" stroke="#cbd5e1" strokeWidth="4.5" fill="none" />
            <line x1="12" y1="88" x2="168" y2="88" stroke="#94a3b8" strokeWidth="3.5" />
            {/* Sydney Opera House Sails */}
            <path d="M168 96 Q182 46 210 96 Z" fill="#ffffff" />
            <path d="M198 96 Q216 38 246 96 Z" fill="#f1f5f9" />
            <path d="M234 96 Q252 54 276 96 Z" fill="#e2e8f0" />
            {/* Harbour Christmas Tree */}
            <polygon points="286,62 272,96 300,96" fill="#16a34a" />
            <circle cx="286" cy="58" r="4" fill="#fde047" />
            <circle cx="282" cy="80" r="2.2" fill="#f43f5e" />
            <circle cx="290" cy="86" r="2.2" fill="#38bdf8" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 320 124"
      preserveAspectRatio="xMidYMid slice"
      aria-label={`${city.city} landmark illustration`}
      className={`w-full h-full block transition-transform duration-300 group-hover:scale-105 ${
        unlocked ? '' : 'opacity-80'
      }`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skyTop} />
          <stop offset="72%" stopColor={palette.skyBottom} />
          <stop offset="100%" stopColor={palette.wallFront} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={palette.lightGlow} stopOpacity="0.38" />
          <stop offset="100%" stopColor={palette.lightGlow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="124" fill={`url(#${gradId})`} />
      <rect width="320" height="124" fill={`url(#${glowId})`} />
      {renderWeather()}
      {renderLandmark()}

      {/* Ground snow / walkway strip */}
      <rect x="0" y="114" width="320" height="12" fill={palette.floorPrimary} opacity="0.88" />
    </svg>
  );
};
