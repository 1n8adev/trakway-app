'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import type { BookingOption, ServiceBookingInput, ServiceBookingOptions } from '@/lib/api';
import { BookServiceIconGlyph } from './icons';

type FieldErrors = Partial<Record<keyof ServiceBookingInput, string>>;

// The browser posts straight to the backend (CORS is open), so this must be public.
const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

const FIELDS: (keyof ServiceBookingInput)[] = [
  'vehicle_type',
  'service',
  'preferred_date',
  'preferred_time',
  'name',
  'email',
  'phone',
  'address',
  'pincode',
  'state'
];

function FieldShell({
  id,
  label,
  icon,
  iconAtTop = false,
  error,
  children
}: {
  id: string;
  label: string;
  icon: ReactNode;
  // Pin the icon to the first line instead of centring it (for textareas).
  iconAtTop?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <span
          className={`pointer-events-none absolute left-3.5 text-gray-400 ${
            iconAtTop ? 'top-3' : 'top-1/2 -translate-y-1/2'
          }`}
        >
          {icon}
        </span>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Options({ placeholder, options }: { placeholder: string; options: BookingOption[] }) {
  return (
    <>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

const fieldClass =
  'w-full appearance-none rounded-lg border border-gray-200 bg-white py-3 pr-4 pl-11 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 aria-invalid:border-red-400';

export default function BookServiceForm({ options }: { options: ServiceBookingOptions }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [bookingNo, setBookingNo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrors({});
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(FIELDS.map((field) => [field, String(form.get(field) ?? '').trim()]));

    try {
      const res = await fetch(`${PUBLIC_API_URL}/api/service-bookings`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        const fieldErrors: FieldErrors = json?.errors ?? {};
        setErrors(fieldErrors);
        if (Object.keys(fieldErrors).length === 0) setFormError(json?.message ?? 'Booking failed. Please try again.');
        setStatus('idle');
        return;
      }

      setBookingNo(json.data.booking_no);
    } catch {
      setFormError('Could not reach the booking service. Please try again.');
      setStatus('idle');
      return;
    }

    setStatus('sent');
  }

  // Shared props for a field: wires the backend error to aria attributes.
  function fieldProps(name: keyof ServiceBookingInput) {
    return {
      id: name,
      name,
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `${name}-error` : undefined
    };
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="rounded-lg bg-green-50 p-4 text-green-700">
          Thanks! Your booking request{' '}
          {bookingNo && <strong className="font-bold">{bookingNo}</strong>} has been received — our team will
          contact you shortly.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <BookServiceIconGlyph icon="calendar" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Book a GPS Service</h2>
          <p className="mt-0.5 text-sm text-gray-500">Fill in the details and our team will contact you</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <FieldShell
          id="vehicle_type"
          label="Vehicle Type"
          error={errors.vehicle_type}
          icon={<BookServiceIconGlyph icon="car" className="h-5 w-5" />}
        >
          <select {...fieldProps('vehicle_type')} required defaultValue="" className={fieldClass}>
            <Options placeholder="Select Vehicle Type" options={options.vehicle_types} />
          </select>
        </FieldShell>

        <FieldShell
          id="service"
          label="Service Required"
          error={errors.service}
          icon={<BookServiceIconGlyph icon="gear" className="h-5 w-5" />}
        >
          <select {...fieldProps('service')} required defaultValue="" className={fieldClass}>
            <Options placeholder="Select Service" options={options.services} />
          </select>
        </FieldShell>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldShell
            id="preferred_date"
            label="Preferred Date"
            error={errors.preferred_date}
            icon={<BookServiceIconGlyph icon="calendar" className="h-5 w-5" />}
          >
            <input {...fieldProps('preferred_date')} type="date" required className={fieldClass} />
          </FieldShell>

          <FieldShell
            id="preferred_time"
            label="Preferred Time"
            error={errors.preferred_time}
            icon={<BookServiceIconGlyph icon="clock" className="h-5 w-5" />}
          >
            <select {...fieldProps('preferred_time')} required defaultValue="" className={fieldClass}>
              <Options placeholder="Select Time" options={options.time_slots} />
            </select>
          </FieldShell>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldShell
            id="name"
            label="Your Name"
            error={errors.name}
            icon={<BookServiceIconGlyph icon="user" className="h-5 w-5" />}
          >
            <input {...fieldProps('name')} type="text" required autoComplete="name" className={fieldClass} />
          </FieldShell>

          <FieldShell
            id="email"
            label="Email Address"
            error={errors.email}
            icon={<BookServiceIconGlyph icon="mail" className="h-5 w-5" />}
          >
            <input {...fieldProps('email')} type="email" autoComplete="email" className={fieldClass} />
          </FieldShell>
        </div>

        <FieldShell
          id="phone"
          label="Phone Number"
          error={errors.phone}
          icon={<BookServiceIconGlyph icon="phone" className="h-5 w-5" />}
        >
          <input
            {...fieldProps('phone')}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            maxLength={10}
            pattern="[0-9]{10}"
            title="Enter a valid 10-digit mobile number"
            className={`${fieldClass} pl-20`}
          />
          <span className="pointer-events-none absolute top-1/2 left-11 -translate-y-1/2 border-r border-gray-200 pr-2.5 text-sm text-gray-500">
            +91
          </span>
        </FieldShell>

        <FieldShell
          id="address"
          label="Address"
          iconAtTop
          error={errors.address}
          icon={<BookServiceIconGlyph icon="mapPin" className="h-5 w-5" />}
        >
          <textarea {...fieldProps('address')} required rows={3} className={`${fieldClass} resize-y`} />
        </FieldShell>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldShell
            id="pincode"
            label="Pincode"
            error={errors.pincode}
            icon={<BookServiceIconGlyph icon="pin" className="h-5 w-5" />}
          >
            <input
              {...fieldProps('pincode')}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              required
              maxLength={6}
              pattern="[1-9][0-9]{5}"
              title="Enter a valid 6-digit pincode"
              className={fieldClass}
            />
          </FieldShell>

          <FieldShell
            id="state"
            label="State"
            error={errors.state}
            icon={<BookServiceIconGlyph icon="mapPin" className="h-5 w-5" />}
          >
            <select
              {...fieldProps('state')}
              required
              defaultValue=""
              autoComplete="address-level1"
              className={fieldClass}
            >
              <Options
                placeholder="Select State"
                options={options.states.map((state) => ({ value: state, label: state }))}
              />
            </select>
          </FieldShell>
        </div>

        {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-sm font-bold tracking-wide text-white uppercase transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? 'Booking...' : 'Book Service Now'}
          <BookServiceIconGlyph icon="arrowRight" className="h-4 w-4" />
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <BookServiceIconGlyph icon="lock" className="h-3.5 w-3.5" />
          Your information is safe with us
        </p>
      </form>
    </div>
  );
}
