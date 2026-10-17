import type { ReactNode } from 'react';

// Store links for the tracking app. Leave empty to show the badge without a link.
const ANDROID_APP_URL = '';
const IOS_APP_URL = '';

export type ProductBadgeLabels = {
  simIncluded: string;
  simIncludedNote: string;
  androidApp: string;
  androidAppNote: string;
  iosApp: string;
  iosAppNote: string;
};

type Badge = { title: string; note: string; icon: ReactNode; iconClass: string; href?: string };

// "SIM card included" + Android / iOS app badges, shown right under the price on the product details page.
// To remove them, delete <ProductBadges /> in app/[locale]/product/[id]/page.tsx
// (or drop one entry from `badges` below to remove just that badge).
export default function ProductBadges({ labels }: { labels: ProductBadgeLabels }) {
  const badges: Badge[] = [
    { title: labels.simIncluded, note: labels.simIncludedNote, icon: <SimIcon />, iconClass: 'bg-green-600' },
    { title: labels.androidApp, note: labels.androidAppNote, icon: <AndroidIcon />, iconClass: 'bg-[#3ddc84]', href: ANDROID_APP_URL },
    { title: labels.iosApp, note: labels.iosAppNote, icon: <AppleIcon />, iconClass: 'bg-gray-900', href: IOS_APP_URL }
  ];

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {badges.map((badge) => {
        const body = (
          <>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${badge.iconClass}`}>
              {badge.icon}
            </span>
            <span>
              <span className="block text-sm font-bold text-gray-900">{badge.title}</span>
              <span className="block text-xs text-gray-500">{badge.note}</span>
            </span>
          </>
        );
        const className = 'flex items-center gap-2.5 rounded-xl border border-gray-200 py-2 pr-4 pl-2';
        return (
          <li key={badge.title}>
            {badge.href ? (
              <a
                href={badge.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${className} transition hover:border-brand-600 hover:shadow-sm`}
              >
                {body}
              </a>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SimIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <rect x="8.5" y="11" width="7" height="7" rx="1" />
      <path d="M12 11v7M8.5 14.5h7" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.5 11.5 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.24 1.83-3.32 1.91-3.37-1.04-1.52-2.66-1.73-3.24-1.75-1.38-.14-2.69.81-3.39.81-.7 0-1.78-.79-2.92-.77-1.5.02-2.89.87-3.66 2.22-1.56 2.71-.4 6.72 1.12 8.92.74 1.08 1.63 2.29 2.79 2.24 1.12-.04 1.54-.72 2.89-.72 1.35 0 1.73.72 2.91.7 1.2-.02 1.96-1.1 2.7-2.18.85-1.25 1.2-2.46 1.22-2.52-.03-.01-2.33-.9-2.33-3.58zM14.15 6.02c.62-.75 1.03-1.78.92-2.82-.89.04-1.97.59-2.6 1.34-.57.66-1.07 1.72-.94 2.73.99.08 2-.5 2.62-1.25z" />
    </svg>
  );
}
