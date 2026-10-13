'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { AuthApiError } from '@/lib/auth';
import {
  INDIAN_STATES,
  createAddress,
  updateAddress,
  validateAddress,
  type Address,
  type AddressErrors,
  type AddressInput
} from '@/lib/addresses';
import { FormAlert, SubmitButton } from '@/components/auth/fields';

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

// Add / edit form for a saved address. Used on the account addresses page and
// reusable at checkout.
export default function AddressForm({
  address,
  forceDefault = false,
  defaultName = '',
  defaultPhone = '',
  onSaved,
  onCancel
}: {
  // Editing when set; adding a new address otherwise.
  address?: Address;
  // The first address is always the default, so the checkbox is hidden.
  forceDefault?: boolean;
  // Prefill for a new address (the customer's own name / phone).
  defaultName?: string;
  defaultPhone?: string;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();

    const input: AddressInput = {
      name: text('name'),
      phone: text('phone'),
      address_line1: text('address_line1'),
      address_line2: text('address_line2') || null,
      landmark: text('landmark') || null,
      city: text('city'),
      state: text('state'),
      pincode: text('pincode')
    };
    // Only send is_default when the customer ticks it (unticking a default is not allowed).
    if (form.get('is_default') === 'on') input.is_default = true;

    const nextErrors = validateAddress(input);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    try {
      const saved = address ? await updateAddress(address.id, input) : await createAddress(input);
      onSaved(saved);
    } catch (err) {
      if (err instanceof AuthApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else setFormError(err instanceof AuthApiError ? err.message : 'Could not save the address. Please try again.');
      setPending(false);
    }
  }

  function inputProps(name: keyof AddressInput) {
    return {
      id: name,
      name,
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `${name}-error` : undefined,
      className: fieldClass
    };
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          <input {...inputProps('name')} autoComplete="name" defaultValue={address?.name ?? defaultName} />
        </Field>
        <Field id="phone" label="Mobile number" error={errors.phone}>
          <input
            {...inputProps('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={address?.phone ?? defaultPhone}
          />
        </Field>

        <Field id="address_line1" label="Flat, house no., building, street" error={errors.address_line1} className="sm:col-span-2">
          <input {...inputProps('address_line1')} autoComplete="address-line1" defaultValue={address?.address_line1} />
        </Field>
        <Field id="address_line2" label="Area, locality" optional error={errors.address_line2} className="sm:col-span-2">
          <input {...inputProps('address_line2')} autoComplete="address-line2" defaultValue={address?.address_line2 ?? ''} />
        </Field>

        <Field id="landmark" label="Landmark" optional error={errors.landmark}>
          <input {...inputProps('landmark')} defaultValue={address?.landmark ?? ''} />
        </Field>
        <Field id="city" label="City / Town" error={errors.city}>
          <input {...inputProps('city')} autoComplete="address-level2" defaultValue={address?.city} />
        </Field>

        <Field id="state" label="State" error={errors.state}>
          <select {...inputProps('state')} autoComplete="address-level1" defaultValue={address?.state ?? ''}>
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
        <Field id="pincode" label="Pincode" error={errors.pincode}>
          <input
            {...inputProps('pincode')}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            defaultValue={address?.pincode}
          />
        </Field>
      </div>

      {!forceDefault && !address?.is_default && (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
          <input type="checkbox" name="is_default" className="h-4 w-4 accent-brand-600" />
          Make this my default address
        </label>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <div className="sm:w-56">
          <SubmitButton pending={pending} pendingLabel="Saving…">
            {address ? 'Save changes' : 'Save address'}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
