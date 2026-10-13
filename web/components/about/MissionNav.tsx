'use client';

import { useEffect, useState } from 'react';

// Sticky pill list next to the mission copy; highlights the section in view.
export default function MissionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A band in the upper middle of the viewport counts as "in view".
      { rootMargin: '-25% 0px -55% 0px' }
    );
    for (const { id } of items) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page" className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-8 lg:flex-col lg:items-start lg:overflow-visible">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.id ? 'true' : undefined}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
            active === item.id ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
