'use client';

import type { FormEvent } from 'react';

export default function NewsletterForm({
  placeholder,
  buttonLabel
}: {
  placeholder: string;
  buttonLabel: string;
}) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="flex overflow-hidden rounded-md bg-white pl-4">
      <input
        type="email"
        required
        placeholder={placeholder}
        className="w-full min-w-0 py-5 text-sm text-gray-700 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-gradient-to-r from-brand-500 to-ink-700 px-6 py-3 text-sm font-semibold text-white"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
