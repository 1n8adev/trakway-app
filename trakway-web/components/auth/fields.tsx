'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { BookServiceIconGlyph, type BookServiceIcon } from '@/components/book-service/icons';

export const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white py-3 pr-4 pl-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 aria-invalid:border-red-400';

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: BookServiceIcon;
  error?: string | null;
  hint?: ReactNode;
  // Rendered at the right end of the label row (e.g. "Forgot password?").
  labelAside?: ReactNode;
  // Rendered inside the input on the right (e.g. show/hide toggle).
  trailing?: ReactNode;
};

export function AuthField({ id, label, icon, error, hint, labelAside, trailing, className, ...inputProps }: AuthFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400">
          <BookServiceIconGlyph icon={icon} className="h-5 w-5" />
        </span>
        <input
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClass} ${trailing ? 'pr-12' : ''} ${className ?? ''}`}
          {...inputProps}
        />
        {trailing && <span className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</span>}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function PasswordField(props: Omit<AuthFieldProps, 'icon' | 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      {...props}
      icon="lock"
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:outline-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
            <circle cx="12" cy="12" r="2.8" />
            {visible && <path d="M4 4l16 16" />}
          </svg>
        </button>
      }
    />
  );
}

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'bg-red-50 text-red-700',
    success: 'bg-green-50 text-green-700',
    info: 'bg-brand-50 text-gray-700'
  }[tone];

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function SubmitButton({ pending, children, pendingLabel }: { pending: boolean; children: ReactNode; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <BookServiceIconGlyph icon="arrowRight" className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export function AuthCardHeader({ icon, title, subtitle }: { icon: BookServiceIcon; title: string; subtitle: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
        <BookServiceIconGlyph icon={icon} className="h-6 w-6" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
