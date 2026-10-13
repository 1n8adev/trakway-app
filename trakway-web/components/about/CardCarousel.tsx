'use client';

import { useRef, type ReactNode } from 'react';

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {direction === 'left' ? <path d="M19 12H5M11 18l-6-6 6-6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

// Horizontally scrolling row with prev/next buttons beside the heading.
export default function CardCarousel({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  const button =
    'flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-gray-900 hover:text-gray-900';

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>{heading}</div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous" className={button}>
            <Arrow direction="left" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next" className={button}>
            <Arrow direction="right" />
          </button>
        </div>
      </div>
      <div
        ref={track}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
