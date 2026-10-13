'use client';

import type { ReactNode } from 'react';
import { INDIAN_STATES, type Address, type AddressInput } from '@/lib/addresses';

export type BillingDraft = {
  name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  company_name: string;
  gstin: string;
};

export type BillingErrors = Partial<Record<keyof BillingDraft, string>>;

export const EMPTY_BILLING: BillingDraft = {
  name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  company_name: '',
  gstin: ''
};

// The address part of the draft, in the shape /api/addresses accepts.
export function billingToAddressInput(draft: BillingDraft): AddressInput {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    address_line1: draft.address_line1.trim(),
    address_line2: draft.address_line2.trim() || null,
    landmark: draft.landmark.trim() || null,
    city: draft.city.trim(),
    state: draft.state,
    pincode: draft.pincode.trim()
  };
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 aria-invalid:border-red-400';

function Field({
  id,
  label,
  optional,
  error,
  className,
  children
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
        {optional && <span className="ml-1 font-normal text-gray-400">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Billing address inputs shown when "Same as shipping address" is unticked.
// Controlled: the checkout owns the draft and submits it with the order.
export default function BillingFields({
  value,
  errors,
  onChange,
  savedAddresses,
  onPickSaved,
  saveToBook,
  onSaveToBookChange,
  alreadySaved
}: {
  value: BillingDraft;
  errors: BillingErrors;
  onChange: (next: BillingDraft) => void;
  savedAddresses: Address[];
  onPickSaved: (address: Address) => void;
  saveToBook: boolean;
  onSaveToBookChange: (save: boolean) => void;
  // Filled from a saved address and unchanged: nothing new to save.
  alreadySaved: boolean;
}) {
  function inputProps(key: keyof BillingDraft) {
    const id = `bill_${key}`;
    return {
      id,
      name: id,
      value: value[key],
      onChange: (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value }),
      'aria-invalid': errors[key] ? true : undefined,
      'aria-describedby': errors[key] ? `${id}-error` : undefined,
      className: fieldClass
    };
  }

  return (
    <div className="space-y-5">
      {savedAddresses.length > 0 && (
        <div>
          <label htmlFor="bill_from_saved" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Fill from a saved address
          </label>
          <select
            id="bill_from_saved"
            value=""
            onChange={(e) => {
              const picked = savedAddresses.find((a) => a.id === Number(e.target.value));
              if (picked) onPickSaved(picked);
            }}
            className={fieldClass}
          >
            <option value="">Choose an address…</option>
            {savedAddresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.address_line1}, {a.city}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="bill_name" label="Full name" error={errors.name}>
          <input {...inputProps('name')} autoComplete="billing name" />
        </Field>
        <Field id="bill_phone" label="Mobile number" error={errors.phone}>
          <input {...inputProps('phone')} type="tel" inputMode="tel" autoComplete="billing tel" />
        </Field>

        <Field id="bill_address_line1" label="Flat, house no., building, street" error={errors.address_line1} className="sm:col-span-2">
          <input {...inputProps('address_line1')} autoComplete="billing address-line1" />
        </Field>
        <Field id="bill_address_line2" label="Area, locality" optional error={errors.address_line2} className="sm:col-span-2">
          <input {...inputProps('address_line2')} autoComplete="billing address-line2" />
        </Field>

        <Field id="bill_landmark" label="Landmark" optional error={errors.landmark}>
          <input {...inputProps('landmark')} />
        </Field>
        <Field id="bill_city" label="City / Town" error={errors.city}>
          <input {...inputProps('city')} autoComplete="billing address-level2" />
        </Field>

        <Field id="bill_state" label="State" error={errors.state}>
          <select {...inputProps('state')} autoComplete="billing address-level1">
            <option value="" disabled>
              Select state
            </option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </Field>
        <Field id="bill_pincode" label="Pincode" error={errors.pincode}>
          <input
            {...inputProps('pincode')}
            inputMode="numeric"
            autoComplete="billing postal-code"
            maxLength={6}
          />
        </Field>
      </div>

      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-sm font-bold text-gray-900">GST details</p>
        <p className="mt-0.5 text-xs text-gray-500">Optional — add these to get a GST invoice for your business.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field id="bill_company_name" label="Company name" optional error={errors.company_name}>
            <input {...inputProps('company_name')} autoComplete="billing organization" maxLength={150} />
          </Field>
          <Field id="bill_gstin" label="GSTIN" optional error={errors.gstin}>
            <input
              {...inputProps('gstin')}
              onChange={(e) => onChange({ ...value, gstin: e.target.value.toUpperCase().replace(/\s/g, '') })}
              maxLength={15}
              className={`${fieldClass} uppercase`}
            />
          </Field>
        </div>
      </div>

      {!alreadySaved && (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={saveToBook}
            onChange={(e) => onSaveToBookChange(e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Save this billing address to my address book
        </label>
      )}
    </div>
  );
}
