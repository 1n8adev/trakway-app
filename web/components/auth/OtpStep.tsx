'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AuthApiError, DEFAULT_RESEND_AFTER, OTP_LENGTH } from '@/lib/auth';
import { AuthField, FormAlert, SubmitButton } from './fields';

type OtpStepProps = {
  email: string;
  submitLabel: string;
  // Seconds until "Resend code" is allowed (from the API's resend_after).
  resendAfter?: number;
  onVerify: (otp: string) => Promise<void>;
  // Resolves with the next resend_after, if the API returned one.
  onResend: () => Promise<number | undefined>;
  onChangeEmail: () => void;
};

function errorMessage(error: unknown) {
  return error instanceof AuthApiError ? error.message : 'Something went wrong. Please try again.';
}

export default function OtpStep({ email, submitLabel, resendAfter, onVerify, onResend, onChangeEmail }: OtpStepProps) {
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(resendAfter ?? DEFAULT_RESEND_AFTER);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await onVerify(otp);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await onResend();
      setOtp('');
      setNotice(`A new code has been sent to ${email}.`);
      setCooldown(next ?? DEFAULT_RESEND_AFTER);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof AuthApiError && err.retryAfter) setCooldown(err.retryAfter);
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-600">
        We sent a {OTP_LENGTH}-digit code to <strong className="font-semibold text-gray-900">{email}</strong>. It’s valid for
        10 minutes.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        {error && <FormAlert>{error}</FormAlert>}
        {notice && <FormAlert tone="success">{notice}</FormAlert>}

        <AuthField
          id="otp"
          label="Verification code"
          icon="shieldCheck"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          autoFocus
          className="font-semibold tracking-[0.5em]"
        />

        <SubmitButton pending={pending} pendingLabel="Verifying…">
          {submitLabel}
        </SubmitButton>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onChangeEmail} className="font-medium text-gray-500 hover:text-gray-800">
          ← Change email
        </button>
        {cooldown > 0 ? (
          <span className="text-gray-500" aria-live="polite">
            Resend code in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-60"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>
    </div>
  );
}
