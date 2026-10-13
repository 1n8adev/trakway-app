'use client';

import { useState, type ReactNode } from 'react';

export type ProductTab = {
  id: string;
  label: string;
  content: ReactNode;
};

export default function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);

  return (
    <div className="mb-16">
      <div className="flex flex-wrap items-center gap-1 rounded-full p-1 justify-center sm:justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveId(tab.id)}
            aria-current={tab.id === activeId}
            className={`cursor-pointer rounded-full border px-5 py-2.5 text-base font-semibold transition ${
              tab.id === activeId
                ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-10">{tabs.find((tab) => tab.id === activeId)?.content}</div>




    </div>
  );
}
