import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

// Animated "how GPS tracking works" scene. Pure SVG/CSS, no JS: a vehicle drives the
// route on a 18s loop while each of the 6 benefits takes a 3s turn being highlighted,
// with a matching live alert popping up on the map (keyframes in globals.css).

const STEP_SECONDS = 3;
const ROUTE = 'M30 210 H205 Q220 210 220 195 V75 Q220 60 235 60 H315 Q330 60 330 45 V34';

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const benefits: { key: 'live' | 'theft' | 'geofence' | 'history' | 'driver' | 'app'; tone: string; icon: ReactNode }[] = [
  {
    key: 'live',
    tone: 'bg-emerald-100 text-emerald-700',
    icon: (
      <svg {...svgProps}>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'theft',
    tone: 'bg-red-100 text-red-600',
    icon: (
      <svg {...svgProps}>
        <path d="M12 3l8 3v5.5c0 4.6-3.4 8.4-8 9.5-4.6-1.1-8-4.9-8-9.5V6l8-3z" />
        <path d="M12 8v4M12 15.5v.01" />
      </svg>
    ),
  },
  {
    key: 'geofence',
    tone: 'bg-brand-100 text-brand-700',
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'history',
    tone: 'bg-sky-100 text-sky-700',
    icon: (
      <svg {...svgProps}>
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
        <path d="M3 4v4h4M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    key: 'driver',
    tone: 'bg-amber-100 text-amber-700',
    icon: (
      <svg {...svgProps}>
        <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
        <path d="M12 13l4-4.5M12 13v.01" />
      </svg>
    ),
  },
  {
    key: 'app',
    tone: 'bg-violet-100 text-violet-700',
    icon: (
      <svg {...svgProps}>
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </svg>
    ),
  },
];

export default function GpsDemoSection() {
  const t = useTranslations('GpsDemo');

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] mt-16 w-screen overflow-hidden bg-gradient-to-b from-white via-brand-50/60 to-white py-16 lg:py-24">
      <div className="mx-auto grid items-center gap-12 px-4 lg:max-w-7xl lg:grid-cols-2">
        {/* Copy + benefits */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-700/10 px-4 py-1.5 text-sm font-semibold text-ink-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t('label')}
          </span>
          <h2 className="mt-4 text-4xl font-extrabold text-gray-900 md:text-5xl">
            {t('headingPart1')}
            <span className="text-brand-600">{t('headingPart2')}</span>
          </h2>
          <p className="mt-4 max-w-xl text-gray-900">{t('subtitle')}</p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <li key={b.key} className="relative overflow-hidden rounded-2xl p-4">
                {/* Highlight card + progress bar while this benefit's step plays */}
                <span
                  className="gps-step absolute inset-0 rounded-2xl bg-white opacity-0 shadow-lg ring-1 ring-brand-100"
                  style={{ animationDelay: `${i * STEP_SECONDS}s` }}
                />
                <span
                  className="gps-progress absolute bottom-0 left-4 right-4 h-0.5 origin-left scale-x-0 rounded bg-brand-600"
                  style={{ animationDelay: `${i * STEP_SECONDS}s` }}
                />
                <div className="relative flex gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${b.tone} [&>svg]:h-5 [&>svg]:w-5`}>
                    {b.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-ink-700">{t(`${b.key}Title`)}</h3>
                    <p className="mt-0.5 text-sm text-gray-900">{t(`${b.key}Desc`)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Live app mock */}
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-brand-100 via-white to-emerald-100 blur-2xl" />

          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-700 text-white">
                  <svg {...svgProps} className="h-5 w-5">
                    <path d="M5 16V11l2-5h10l2 5v5M5 16h14M5 16v2M19 16v2" />
                    <circle cx="8" cy="13.5" r=".8" fill="currentColor" />
                    <circle cx="16" cy="13.5" r=".8" fill="currentColor" />
                  </svg>
                </span>
                <div className="text-left">
                  <p className="font-bold text-ink-700">TRK-1023</p>
                  <p className="flex items-center gap-1.5 text-xs text-gray-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('vehicleStatus')} · 48 km/h
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                {t('live')}
              </span>
            </div>

            <div className="relative aspect-[4/3] bg-[#eef4ee]">
              <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
                {/* Parks and river */}
                <rect x="250" y="160" width="130" height="110" rx="14" fill="#d5e9d4" />
                <rect x="18" y="18" width="120" height="80" rx="14" fill="#d5e9d4" />
                <path d="M0 125 C80 105 130 150 200 132 S330 100 400 112 V140 C330 128 270 165 200 160 S80 135 0 155Z" fill="#cde3f1" />

                {/* Roads */}
                <g stroke="#fff" strokeLinecap="round">
                  <path d="M0 60H400M0 210H400M90 0V300M220 0V300M330 0V300" strokeWidth="14" />
                  <path d="M0 255H400M150 0V300M0 20H400M270 0V300" strokeWidth="6" opacity=".8" />
                </g>

                {/* Geofence around the destination */}
                <circle cx="330" cy="40" r="30" fill="#FA801D" fillOpacity=".08" stroke="#FA801D" strokeWidth="1.5" strokeDasharray="4 4">
                  <animate attributeName="r" values="28;33;28" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Other fleet vehicles, parked */}
                <circle cx="90" cy="105" r="6" fill="#12433f" opacity=".5" />
                <circle cx="330" cy="245" r="6" fill="#12433f" opacity=".5" />

                {/* Route: faint full path, then the travelled part drawn in sync with the vehicle */}
                <path d={ROUTE} fill="none" stroke="#FA801D" strokeOpacity=".3" strokeWidth="5" strokeDasharray="2 7" strokeLinecap="round" />
                <path d={ROUTE} pathLength={1} fill="none" stroke="#FA801D" strokeWidth="5" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="1">
                  <animate attributeName="stroke-dashoffset" values="1;0" dur="18s" repeatCount="indefinite" />
                </path>

                {/* Start and destination pins */}
                <circle cx="30" cy="210" r="7" fill="#fff" stroke="#10b981" strokeWidth="4" />
                <g transform="translate(330 34)">
                  <path d="M0 0c-6-7-9-11-9-15a9 9 0 0 1 18 0c0 4-3 8-9 15z" fill="#12433f" />
                  <circle cy="-15" r="3.5" fill="#fff" />
                </g>

                {/* The tracked vehicle */}
                <g>
                  <animateMotion dur="18s" repeatCount="indefinite" rotate="auto" path={ROUTE} />
                  <circle r="11" fill="#FA801D" opacity=".4">
                    <animate attributeName="r" values="11;24" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values=".4;0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle r="11" fill="#fff" />
                  <circle r="8" fill="#12433f" />
                  <path d="M-3 -4L4 0L-3 4Z" fill="#fff" />
                </g>
              </svg>

              {/* Live alerts, one per benefit step */}
              {benefits.map((b, i) => (
                <div
                  key={b.key}
                  className="gps-toast absolute left-3 right-3 top-3 flex items-center gap-3 rounded-xl bg-white/95 px-3 py-2.5 opacity-0 shadow-lg ring-1 ring-black/5 backdrop-blur sm:left-auto sm:max-w-xs"
                  style={{ animationDelay: `${i * STEP_SECONDS}s` }}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${b.tone} [&>svg]:h-4 [&>svg]:w-4`}>
                    {b.icon}
                  </span>
                  <p className="text-left text-xs font-medium text-ink-700">{t(`${b.key}Toast`)}</p>
                </div>
              ))}
            </div>

            <dl className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 text-center">
              {[
                ['statToday', '42 km'],
                ['statStops', '3'],
                ['statTopSpeed', '64 km/h'],
              ].map(([label, value]) => (
                <div key={label} className="px-2 py-3">
                  <dt className="text-xs text-gray-900">{t(label as 'statToday' | 'statStops' | 'statTopSpeed')}</dt>
                  <dd className="mt-0.5 font-extrabold text-ink-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
