'use client';

import { useState } from 'react';
import type { Faq } from '@/lib/api';

export default function FaqAccordion({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.id} className="border-b border-gray-200 py-4">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <span className="font-bold text-gray-900 md:text-2xl text-xl">{item.question}</span>
              <span className="mt-0.5 shrink-0 text-xl leading-none text-brand-600">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen &&
              item.answer.map((paragraph, p) => (
                <p key={p} className="mt-3 leading-relaxed text-gray-600 text-1xl">
                  {paragraph}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
}
