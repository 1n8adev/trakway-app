'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/navigation';
import { AuthApiError } from '@/lib/auth';
import { createAddress, deleteAddress, listAddresses, validateAddress, type Address } from '@/lib/addresses';
import { refreshCart } from '@/lib/cart';
import { fetchCheckoutSummary, placeOrder, validateGstDetails, type CheckoutSummary } from '@/lib/checkout';
import { formatPrice } from '@/lib/format';
import { useAuthSession } from '@/components/auth/useAuthSession';
import { FormAlert } from '@/components/auth/fields';
import AddressForm from '@/components/account/AddressForm';
import BillingFields, { EMPTY_BILLING, billingToAddressInput, type BillingDraft, type BillingErrors } from './BillingFields';
import { BookServiceIconGlyph } from '@/components/book-service/icons';

const PLACEHOLDER_IMAGE = '/images/products/v5/v5.png';
const NOTE_LIMIT = 500;

function errorMessage(error: unknown) {
  return error instanceof AuthApiError ? error.message : 'Something went wrong. Please try again.';
}

function Step({ number, title, children, aside }: { number: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm text-white">{number}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// Radio cards for the saved addresses, plus "Add a new address" inline.
function AddressPicker({
  name,
  addresses,
  selectedId,
  onSelect,
  adding,
  onAddingChange,
  onSaved,
  defaultName,
  defaultPhone
}: {
  name: string;
  addresses: Address[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
  onSaved: (address: Address) => void;
  defaultName: string;
  defaultPhone: string;
}) {
  // No saved addresses yet: go straight to the form.
  if (adding || addresses.length === 0) {
    return (
      <AddressForm
        forceDefault={addresses.length === 0}
        defaultName={defaultName}
        defaultPhone={defaultPhone}
        onSaved={onSaved}
        onCancel={addresses.length > 0 ? () => onAddingChange(false) : undefined}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
        {addresses.map((address) => {
          const checked = address.id === selectedId;
          return (
            <label
              key={address.id}
              className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                checked ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onSelect(address.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
              />
              <span className="min-w-0 text-sm text-gray-600">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-900">{address.name}</span>
                  {address.is_default && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white uppercase">Default</span>
                  )}
                </span>
                <span className="mt-1 block leading-relaxed">
                  {address.address_line1}
                  {address.address_line2 && `, ${address.address_line2}`}
                  {address.landmark && `, ${address.landmark}`}
                  <br />
                  {address.city}, {address.state} - {address.pincode}
                </span>
                <span className="mt-1 block">{address.phone}</span>
              </span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onAddingChange(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        <span className="text-lg leading-none">+</span> Add a new address
      </button>
    </div>
  );
}

function TotalRow({ label, value, tone }: { label: ReactNode; value: string; tone?: 'discount' | 'free' }) {
  const color = tone === 'discount' ? 'text-red-500' : tone === 'free' ? 'text-green-600' : 'text-gray-900';
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-semibold ${color}`}>{value}</dd>
    </div>
  );
}

export default function CheckoutView() {
  const router = useRouter();
  const session = useAuthSession();

  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [shippingId, setShippingId] = useState<number | null>(null);
  const [addingShipping, setAddingShipping] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [billingDraft, setBillingDraft] = useState<BillingDraft>(EMPTY_BILLING);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  // Set when the draft was filled from a saved address and not edited since.
  const [billingSavedId, setBillingSavedId] = useState<number | null>(null);
  const [saveBillingToBook, setSaveBillingToBook] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<{ message: string; backToCart?: boolean } | null>(null);

  const loggedIn = Boolean(session);

  useEffect(() => {
    if (session === null) router.replace('/auth?tab=login&next=/checkout');
  }, [session, router]);

  async function loadAddresses(select?: { shipping?: number }) {
    const list = await listAddresses();
    setAddresses(list);
    const fallback = list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null;
    setShippingId((current) => select?.shipping ?? (list.some((a) => a.id === current) ? current : fallback));
  }

  // Validates the typed billing address + GST details; shows errors and returns false if invalid.
  function checkBilling() {
    const gst = validateGstDetails(billingDraft.company_name.trim(), billingDraft.gstin.trim());
    const errors: BillingErrors = {
      ...validateAddress(billingToAddressInput(billingDraft)),
      company_name: gst.billing_company_name,
      gstin: gst.billing_gstin
    };
    const hasErrors = Object.values(errors).some(Boolean);
    setBillingErrors(hasErrors ? errors : {});
    if (hasErrors) document.getElementById('billing-address')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return !hasErrors;
  }

  useEffect(() => {
    if (!loggedIn) return;
    Promise.all([fetchCheckoutSummary().then(setSummary), loadAddresses()]).catch((err) => setLoadError(errorMessage(err)));
  }, [loggedIn]);

  async function applyCoupon(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Enter a coupon code.');
      return;
    }
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      setSummary(await fetchCheckoutSummary(code));
      setCouponInput('');
    } catch (err) {
      setCouponError(err instanceof AuthApiError ? (err.fieldErrors.coupon_code ?? err.message) : errorMessage(err));
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function removeCoupon() {
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      setSummary(await fetchCheckoutSummary(null));
    } catch (err) {
      setCouponError(errorMessage(err));
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function handlePlaceOrder() {
    setPlaceError(null);
    if (!shippingId) {
      setPlaceError({ message: 'Select a shipping address.' });
      return;
    }
    if (!billingSame && !checkBilling()) {
      setPlaceError({ message: 'Please check the billing address.' });
      return;
    }

    setPlacing(true);
    // The API takes the billing address as a saved address id, so a typed one is
    // saved first. Unless the customer asked to keep it, it is removed afterwards
    // (the order keeps its own copy in the bill_* columns).
    let tempBillingId: number | null = null;
    try {
      let billingAddressId: number | null = null;
      if (!billingSame) {
        if (billingSavedId) {
          billingAddressId = billingSavedId;
        } else {
          billingAddressId = (await createAddress(billingToAddressInput(billingDraft))).id;
          if (!saveBillingToBook) tempBillingId = billingAddressId;
        }
      }

      const order = await placeOrder({
        addressId: shippingId,
        billingSameAsShipping: billingSame,
        billingAddressId,
        billingCompanyName: billingSame ? null : billingDraft.company_name.trim() || null,
        billingGstin: billingSame ? null : billingDraft.gstin.trim() || null,
        couponCode: summary?.coupon?.code ?? null,
        note: note.trim() || null
      });
      if (tempBillingId) deleteAddress(tempBillingId).catch(() => {});
      // The backend emptied the cart; update the header badge.
      refreshCart().catch(() => {});
      router.replace(`/checkout/success?order=${encodeURIComponent(order.order_no)}`);
    } catch (err) {
      setPlacing(false);
      if (tempBillingId) deleteAddress(tempBillingId).catch(() => {});
      // Billing field errors, from saving the address or from the order (GST details).
      if (err instanceof AuthApiError && !billingSame) {
        const f = err.fieldErrors;
        const billing: BillingErrors = {
          name: f.name,
          phone: f.phone,
          address_line1: f.address_line1,
          address_line2: f.address_line2,
          landmark: f.landmark,
          city: f.city,
          state: f.state,
          pincode: f.pincode,
          company_name: f.billing_company_name,
          gstin: f.billing_gstin
        };
        if (Object.values(billing).some(Boolean)) {
          setBillingErrors(billing);
          setPlaceError({ message: 'Please check the billing address.' });
          return;
        }
      }
      if (err instanceof AuthApiError && err.fieldErrors.coupon_code) {
        // Coupon stopped being valid (expired, limit reached): drop it and show fresh totals.
        setCouponError(err.fieldErrors.coupon_code);
        fetchCheckoutSummary(null).then(setSummary).catch(() => {});
        setPlaceError({ message: 'Your coupon could not be applied. Review the updated total and place the order again.' });
        return;
      }
      setPlaceError({
        message: errorMessage(err),
        backToCart: err instanceof AuthApiError && (err.status === 409 || /cart is empty/i.test(err.message))
      });
    }
  }

  if (loadError && (!summary || !addresses)) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-red-600">{loadError}</p>
        <Link href="/cart" className="mt-4 inline-block font-semibold text-brand-600 hover:text-brand-700">
          ← Back to cart
        </Link>
      </div>
    );
  }

  if (!session?.user || !summary || !addresses) {
    return (
      <div className="grid gap-6 lg:grid-cols-12" aria-busy="true">
        <div className="space-y-6 lg:col-span-7">
          <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-5" />
      </div>
    );
  }

  if (summary.items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-lg font-bold text-gray-900">Your cart is empty</p>
        <p className="mt-1 text-gray-500">Add a product to your cart to check out.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const { totals, coupon } = summary;
  const productDiscount = Math.max(0, totals.mrpTotal - totals.subtotal);
  const totalSavings = productDiscount + totals.couponDiscount;
  const hasUnavailable = summary.summary.unavailableCount > 0;
  const canPlace = Boolean(shippingId) && !hasUnavailable && !placing;
  const user = session.user;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        <Step number={1} title="Shipping address">
          <AddressPicker
            name="shipping_address"
            addresses={addresses}
            selectedId={shippingId}
            onSelect={setShippingId}
            adding={addingShipping}
            onAddingChange={setAddingShipping}
            onSaved={async (address) => {
              setAddingShipping(false);
              await loadAddresses({ shipping: address.id });
            }}
            defaultName={user.name}
            defaultPhone={user.phone ?? ''}
          />
        </Step>

        <div id="billing-address" className="scroll-mt-6">
          <Step number={2} title="Billing address">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={billingSame}
                onChange={(e) => {
                  setBillingSame(e.target.checked);
                  setBillingErrors({});
                }}
                className="h-4 w-4 accent-brand-600"
              />
              Same as shipping address
            </label>

            {!billingSame && (
              <div className="mt-5">
                <BillingFields
                  value={billingDraft}
                  errors={billingErrors}
                  onChange={(next) => {
                    setBillingDraft(next);
                    setBillingSavedId(null);
                  }}
                  savedAddresses={addresses}
                  onPickSaved={(address) => {
                    setBillingDraft((draft) => ({
                      ...draft,
                      name: address.name,
                      phone: address.phone,
                      address_line1: address.address_line1,
                      address_line2: address.address_line2 ?? '',
                      landmark: address.landmark ?? '',
                      city: address.city,
                      state: address.state,
                      pincode: address.pincode
                    }));
                    setBillingSavedId(address.id);
                    setBillingErrors({});
                  }}
                  saveToBook={saveBillingToBook}
                  onSaveToBookChange={setSaveBillingToBook}
                  alreadySaved={billingSavedId !== null}
                />
              </div>
            )}
          </Step>
        </div>

        <Step number={3} title="Payment method">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-600 bg-brand-50 p-4 ring-2 ring-brand-100">
            <input type="radio" name="payment_method" value="cod" checked readOnly className="mt-1 h-4 w-4 accent-brand-600" />
            <span>
              <span className="flex items-center gap-2 font-bold text-gray-900">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5 text-brand-600" aria-hidden="true">
                  <rect x="2.5" y="6" width="19" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                  <path d="M6 9.5v5M18 9.5v5" />
                </svg>
                Cash on Delivery
              </span>
              <span className="mt-1 block text-sm text-gray-600">
                Pay {formatPrice(totals.total)} in cash when your order is delivered.
              </span>
            </span>
          </label>
          <p className="mt-3 text-xs text-gray-500">Online payment options are coming soon.</p>

          <div className="mt-6">
            <label htmlFor="order_note" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Order note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="order_note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_LIMIT))}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {note.length}/{NOTE_LIMIT}
            </p>
          </div>
        </Step>
      </div>

      <aside className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 lg:sticky lg:top-6 lg:col-span-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
          <Link href="/cart" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Edit cart
          </Link>
        </div>

        <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
          {summary.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <Image src={item.image ?? PLACEHOLDER_IMAGE} alt={item.name} fill sizes="64px" className="object-contain p-1" />
                <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-bl-lg bg-ink-700 px-1 text-[10px] font-bold text-white">
                  {item.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-gray-900">{item.name}</p>
                {item.variantLabel && <p className="text-gray-500">{item.variantLabel}</p>}
                <p className="text-gray-500">
                  {item.quantity} × {formatPrice(item.finalPrice)}
                </p>
                {!item.available && <p className="text-red-600">{item.message ?? 'Unavailable'}</p>}
              </div>
              <p className="text-sm font-bold text-gray-900">{formatPrice(item.lineTotal)}</p>
            </li>
          ))}
        </ul>

        {/* Coupon */}
        <div className="mt-6 border-t border-gray-200 pt-5">
          {coupon ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-dashed border-green-400 bg-green-50 p-3">
              <div className="flex items-start gap-2">
                <BookServiceIconGlyph icon="shieldCheck" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div className="text-sm">
                  <p className="font-bold text-green-800">{coupon.code} applied</p>
                  <p className="text-green-700">{coupon.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                disabled={applyingCoupon || placing}
                className="text-sm font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={applyCoupon} noValidate>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true">
                    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
                    <circle cx="7.5" cy="8" r="1.5" />
                  </svg>
                  <input
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    maxLength={30}
                    placeholder="Add promo code"
                    aria-label="Coupon code"
                    aria-invalid={couponError ? true : undefined}
                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pr-4 pl-11 text-sm text-gray-900 uppercase outline-none transition placeholder:normal-case placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={applyingCoupon}
                  className="rounded-full bg-ink-700 px-6 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-60"
                >
                  {applyingCoupon ? 'Applying…' : 'Apply'}
                </button>
              </div>
            </form>
          )}
          {couponError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {couponError}
            </p>
          )}
        </div>

        <dl className="mt-5 space-y-3 border-t border-gray-200 pt-5">
          <TotalRow label={`Price (${summary.summary.quantityTotal} item${summary.summary.quantityTotal === 1 ? '' : 's'})`} value={formatPrice(totals.mrpTotal)} />
          {productDiscount > 0 && <TotalRow label="Discount" value={`- ${formatPrice(productDiscount)}`} tone="discount" />}
          {totals.couponDiscount > 0 && (
            <TotalRow label={`Coupon (${coupon?.code})`} value={`- ${formatPrice(totals.couponDiscount)}`} tone="discount" />
          )}
          <TotalRow
            label="Shipping"
            value={totals.shippingFee > 0 ? formatPrice(totals.shippingFee) : 'Free'}
            tone={totals.shippingFee > 0 ? undefined : 'free'}
          />
          <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
            <dt className="font-semibold text-gray-900">Total</dt>
            <dd className="text-2xl font-bold text-gray-900">{formatPrice(totals.total)}</dd>
          </div>
        </dl>

        {totalSavings > 0 && (
          <p className="mt-4 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
            You save {formatPrice(totalSavings)} on this order
          </p>
        )}

        {hasUnavailable && (
          <div className="mt-4">
            <FormAlert>
              Some items are unavailable.{' '}
              <Link href="/cart" className="font-semibold underline">
                Update your cart
              </Link>{' '}
              to continue.
            </FormAlert>
          </div>
        )}

        {placeError && (
          <div className="mt-4">
            <FormAlert>
              {placeError.message}
              {placeError.backToCart && (
                <>
                  {' '}
                  <Link href="/cart" className="font-semibold underline">
                    Go to cart
                  </Link>
                </>
              )}
            </FormAlert>
          </div>
        )}

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={!canPlace}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-ink-700 px-6 py-4 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {placing ? 'Placing order…' : `Place order · ${formatPrice(totals.total)}`}
          {!placing && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-gray-500">
          Cash on Delivery · Inclusive of all taxes · Free shipping across India
        </p>
      </aside>
    </div>
  );
}
