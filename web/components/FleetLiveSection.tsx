import { useTranslations } from 'next-intl';

// Full-width "fleet control room": 3 vehicles drive their own routes on a light city map
// (SVG SMIL, each on its own loop) while a 4th sits idle at the depot. Alert bubbles pop
// over the vehicles and a live alert feed scrolls on the side (keyframes in globals.css).

type VehicleKey = 'truck' | 'car' | 'bike' | 'van';

const COLORS: Record<VehicleKey, string> = {
  truck: '#FA801D',
  car: '#059669',
  bike: '#0284c7',
  van: '#7c3aed',
};

const moving: { key: Exclude<VehicleKey, 'van'>; route: string; dur: number; bubble: string; bubbleAt: string }[] = [
  {
    key: 'truck',
    route: 'M-20 330 C300 300 500 180 800 200 S1100 120 1220 140',
    dur: 22,
    bubble: 'bubbleTruck',
    bubbleAt: '0;0;1;1;0;0',
  },
  {
    key: 'car',
    route: 'M150 520 V250 H600 V90 H1050 V-20',
    dur: 18,
    bubble: 'bubbleCar',
    bubbleAt: '0;0;0;1;1;0',
  },
  {
    key: 'bike',
    route: 'M1220 410 H820 V250 H380 V90 H-20',
    dur: 20,
    bubble: 'bubbleBike',
    bubbleAt: '0;1;1;0;0;0',
  },
];

const feed: { vehicle: VehicleKey; msg: string; min: number; icon: string }[] = [
  { vehicle: 'truck', msg: 'feedOverspeed', min: 0, icon: 'M12 13l4-4.5M4.5 17a8.5 8.5 0 1 1 15 0' },
  { vehicle: 'car', msg: 'feedGeofenceIn', min: 1, icon: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 9.5v5M9.5 12h5' },
  { vehicle: 'van', msg: 'feedIdle', min: 2, icon: 'M12 7.5V12l3 2M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0' },
  { vehicle: 'bike', msg: 'feedHarshBrake', min: 4, icon: 'M12 8v4M12 15.5v.01M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
  { vehicle: 'truck', msg: 'feedTripStart', min: 6, icon: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7v5' },
  { vehicle: 'car', msg: 'feedIgnitionOff', min: 9, icon: 'M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0' },
  { vehicle: 'bike', msg: 'feedTamper', min: 12, icon: 'M12 3l8 3v5.5c0 4.6-3.4 8.4-8 9.5-4.6-1.1-8-4.9-8-9.5V6l8-3zM12 8v4M12 15.5v.01' },
  { vehicle: 'van', msg: 'feedGeofenceOut', min: 15, icon: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM9.5 12h5' },
];

// `hero`: used as the home page hero — the heading becomes the page <h1> and the section
// sits inside the full-bleed hero wrapper instead of breaking out of the content column itself.
export default function FleetLiveSection({ hero = false }: { hero?: boolean }) {
  const t = useTranslations('FleetLive');
  const Heading = hero ? 'h1' : 'h2';

  const stats = [
    ['4', 'statVehicles', 'text-ink-700'],
    ['3', 'statMoving', 'text-emerald-600'],
    ['1', 'statIdle', 'text-violet-600'],
    ['8', 'statAlerts', 'text-brand-600'],
  ] as const;

  const feedCard = (item: (typeof feed)[number], i: number) => (
    <li key={i} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${COLORS[item.vehicle]}26`, color: COLORS[item.vehicle] }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={item.icon} />
        </svg>
      </span>
      <div className="min-w-0 text-left">
        <p className="flex items-center gap-2 text-xs">
          <span className="font-bold" style={{ color: COLORS[item.vehicle] }}>
            {t(item.vehicle)}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">{item.min === 0 ? t('justNow') : t('minAgo', { n: item.min })}</span>
        </p>
        <p className="mt-0.5 text-sm text-ink-700">{t(item.msg as 'feedOverspeed')}</p>
      </div>
    </li>
  );

  return (
    <section
      className={`relative flex flex-col ${hero ? 'w-full' : 'left-1/2 right-1/2 -mx-[50vw] mt-16 w-screen'} overflow-hidden bg-gradient-to-br from-white via-[#fffaf5] to-brand-50 text-ink-700 lg:block lg:h-[640px]`}
    >
      {/* Map */}
      <div className="relative order-2 h-[380px] lg:absolute lg:inset-0 lg:h-full">
        <svg viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <filter id="fleet-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="fleet-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#12433f" opacity=".08" />
            </pattern>
          </defs>

          <rect width="1200" height="500" fill="url(#fleet-dots)" />
          {/* River and parks */}
          <path d="M0 170 C200 140 330 210 520 175 S900 120 1200 165 V195 C900 150 720 215 520 205 S200 170 0 200Z" fill="#38bdf8" opacity=".18" />
          <rect x="400" y="290" width="170" height="95" rx="16" fill="#34d399" opacity=".15" />
          <rect x="860" y="20" width="160" height="50" rx="16" fill="#34d399" opacity=".15" />

          {/* Roads */}
          <g stroke="#e6ebe8" strokeLinecap="round" fill="none">
            <path d="M0 90H1200M0 250H1200M0 410H1200M150 0V500M380 0V500M600 0V500M820 0V500M1050 0V500" strokeWidth="16" />
            <path d="M-20 330 C300 300 500 180 800 200 S1100 120 1220 140" strokeWidth="22" />
            <path d="M0 170H1200M265 0V500M490 0V500M710 0V500M935 0V500M0 330H1200" strokeWidth="5" opacity=".8" />
          </g>

          {/* Depot geofence with the idle van */}
          <rect x="985" y="360" width="130" height="100" rx="14" fill={COLORS.van} fillOpacity=".08" stroke={COLORS.van} strokeOpacity=".7" strokeWidth="1.5" strokeDasharray="6 6">
            <animate attributeName="stroke-dashoffset" values="0;-24" dur="2s" repeatCount="indefinite" />
          </rect>
          <text x="997" y="380" fill={COLORS.van} fontSize="12" fontWeight="700" opacity=".9">
            {t('depot')}
          </text>
          <g transform="translate(1050 418)">
            <circle r="13" fill={COLORS.van} opacity=".35">
              <animate attributeName="r" values="13;30" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".35;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r="12" fill={COLORS.van} stroke="#fff" strokeWidth="3" />
            <foreignObject x="18" y="-13" width="160" height="26">
              <div className="inline-flex h-[26px] items-center rounded-full bg-white px-2.5 text-xs font-semibold text-ink-700 shadow-md ring-1 ring-black/5">
                {t('van')} · {t('idle')}
              </div>
            </foreignObject>
          </g>

          {/* Moving vehicles: faint route, glowing trail drawn in sync, marker + label + alert bubble */}
          {moving.map((v) => (
            <g key={v.key}>
              <path d={v.route} fill="none" stroke={COLORS[v.key]} strokeOpacity=".22" strokeWidth="4" strokeDasharray="3 9" strokeLinecap="round" />
              <path d={v.route} pathLength={1} fill="none" stroke={COLORS[v.key]} strokeWidth="4" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="1" filter="url(#fleet-glow)">
                <animate attributeName="stroke-dashoffset" values="1;0" dur={`${v.dur}s`} repeatCount="indefinite" />
              </path>
              <g>
                <animateMotion dur={`${v.dur}s`} repeatCount="indefinite" path={v.route} />
                <circle r="13" fill={COLORS[v.key]} opacity=".4">
                  <animate attributeName="r" values="13;28" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values=".4;0" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle r="12" fill={COLORS[v.key]} stroke="#fff" strokeWidth="3" />
                <foreignObject x="18" y="-13" width="160" height="26">
                  <div className="inline-flex h-[26px] items-center rounded-full bg-white px-2.5 text-xs font-semibold text-ink-700 shadow-md ring-1 ring-black/5">
                    {t(v.key)}
                  </div>
                </foreignObject>
                <g opacity="0">
                  <animate attributeName="opacity" values={v.bubbleAt} dur={`${v.dur}s`} repeatCount="indefinite" />
                  <foreignObject x="-130" y="-62" width="260" height="40">
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xl">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[v.key] }} />
                        {t(v.bubble as 'bubbleTruck')}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              </g>
            </g>
          ))}
        </svg>

        {/* Fade the map under the overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[45%] bg-gradient-to-r from-white via-white/80 to-transparent lg:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-gradient-to-l from-brand-50 via-brand-50/60 to-transparent lg:block" />
      </div>

      {/* Overlays: copy on the left, alert feed on the right */}
      <div className="contents lg:pointer-events-none lg:absolute lg:inset-0 lg:mx-auto lg:flex lg:max-w-7xl lg:items-stretch lg:justify-between lg:gap-8 lg:px-4 lg:py-12">
        <div className="order-1 px-4 pb-6 pt-14 text-left lg:pointer-events-auto lg:max-w-md lg:self-center lg:p-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-700/10 px-4 py-1.5 text-sm font-semibold text-ink-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t('label')}
          </span>
          <Heading className="mt-4 text-4xl font-extrabold text-gray-900 md:text-5xl">
            {t('headingPart1')}
            <span className="text-brand-600">{t('headingPart2')}</span>
          </Heading>
          <p className="mt-4 text-gray-900">{t('subtitle')}</p>

          <dl className="mt-8 grid grid-cols-4 gap-2">
            {stats.map(([value, label, color]) => (
              <div key={label} className="rounded-xl bg-white/80 px-2 py-3 text-center shadow-sm ring-1 ring-black/5 backdrop-blur">
                <dd className={`text-2xl font-extrabold ${color}`}>{value}</dd>
                <dt className="mt-0.5 text-[11px] text-gray-500">{t(label)}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="order-3 px-4 pb-14 lg:pointer-events-auto lg:flex lg:w-80 lg:flex-col lg:p-0">
          <div className="flex flex-col rounded-2xl bg-white/60 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-md lg:min-h-0 lg:flex-1">
            <p className="mb-3 flex items-center justify-between text-sm font-bold text-ink-700">
              {t('feedTitle')}
              <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                {t('live')}
              </span>
            </p>
            <div className="h-72 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] lg:h-auto lg:min-h-0 lg:flex-1">
              {/* List rendered twice so the upward scroll loops seamlessly */}
              <ul className="fleet-feed flex flex-col gap-2.5 pb-2.5">
                {feed.map(feedCard)}
                {feed.map((item, i) => feedCard(item, i + feed.length))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
