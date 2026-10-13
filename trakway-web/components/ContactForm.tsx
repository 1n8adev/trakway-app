'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

export default function ContactForm() {
  const t = useTranslations('Contact');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');

    // Wire this up to your real backend / email service (e.g. an API route,
    // Resend, Formspree, etc). This demo just simulates a submission.
    setTimeout(() => setStatus('sent'), 600);
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-green-700">{t('successMessage')}</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
            {t('firstNameLabel')}
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
            {t('lastNameLabel')}
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
 <div>
        <label htmlFor="phoneNumber" className="mb-1 block text-sm font-medium text-gray-700">
          {t('phoneNumberLabel')}
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          {t('emailLabel')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
          {t('messageLabel')}
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-full bg-brand-500 px-8 py-3 font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
      >
        {status === 'submitting' ? t('sending') : t('send')}
      </button>
    </form>
  );
}
