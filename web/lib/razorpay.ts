// Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
// Browser-only. The API creates the Razorpay order and verifies the result; this file only opens the
// payment popup and hands back what Razorpay returns.

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

// What POST /api/orders (razorpay) and POST /api/orders/:orderNo/pay return as `payment`.
export type RazorpayCheckoutOptions = {
  key_id: string;
  razorpay_order_id: string;
  amount: number; // paise
  currency: string;
  name: string;
  description: string;
  order_no: string;
  prefill: { name?: string; email?: string; contact?: string };
  expires_at: string;
};

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

// Rejections from openRazorpayCheckout.
export class RazorpayCheckoutError extends Error {
  constructor(
    message: string,
    readonly reason: 'dismissed' | 'failed' | 'unavailable'
  ) {
    super(message);
  }
}

type RazorpayInstance = { open: () => void; on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

let scriptPromise: Promise<RazorpayConstructor> | null = null;

function loadScript(): Promise<RazorpayConstructor> {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        const loaded = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
        if (loaded) resolve(loaded);
        else reject(new Error('Razorpay did not load'));
      };
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Razorpay did not load'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

// Opens the Razorpay popup. Resolves with the handler values (to send to verify-payment); rejects with
// RazorpayCheckoutError when the customer closes it or the script can't load. A failed attempt keeps the
// popup open (Razorpay lets the customer retry), so 'failed' is only reported if they then close it.
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions, themeColor = '#f97316'): Promise<RazorpaySuccess> {
  let Razorpay: RazorpayConstructor;
  try {
    Razorpay = await loadScript();
  } catch {
    throw new RazorpayCheckoutError('Could not load the payment window. Check your connection and try again.', 'unavailable');
  }

  return new Promise<RazorpaySuccess>((resolve, reject) => {
    let lastError: string | null = null;
    const instance = new Razorpay({
      key: options.key_id,
      order_id: options.razorpay_order_id,
      amount: options.amount,
      currency: options.currency,
      name: options.name,
      description: options.description,
      prefill: options.prefill,
      notes: { order_no: options.order_no },
      theme: { color: themeColor },
      retry: { enabled: true },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: {
        confirm_close: true,
        ondismiss: () =>
          reject(
            lastError
              ? new RazorpayCheckoutError(`Payment failed: ${lastError}`, 'failed')
              : new RazorpayCheckoutError('Payment was cancelled.', 'dismissed')
          )
      }
    });
    instance.on('payment.failed', (response) => {
      lastError = response.error?.description ?? 'Payment failed';
    });
    instance.open();
  });
}
