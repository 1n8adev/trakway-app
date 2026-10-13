'use client';

import { useState, type FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import {
  AuthApiError,
  forgotPassword,
  normalizeEmail,
  resetPassword,
  validateEmail,
  validatePassword,
  verifyForgotPasswordOtp
} from '@/lib/auth';
import { AuthCardHeader, AuthField, FormAlert, PasswordField, SubmitButton } from './fields';
import OtpStep from './OtpStep';

type Step =
  | { name: 'email' }
  | { name: 'otp'; email: string; resendAfter?: number }
  | { name: 'reset'; resetToken: string }
  | { name: 'done' };

function errorMessage(error: unknown) {
  return error instanceof AuthApiError ? error.message : 'Something went wrong. Please try again.';
}

const STEP_HEADERS = {
  email: { icon: 'lock', title: 'Forgot your password?', subtitle: 'Enter your email and we’ll send you a code to reset it' },
  otp: { icon: 'mail', title: 'Check your email', subtitle: 'Enter the code to continue' },
  reset: { icon: 'shieldCheck', title: 'Set a new password', subtitle: 'Choose a strong password you haven’t used before' },
  done: { icon: 'shieldCheck', title: 'Password updated', subtitle: 'You can now log in with your new password' }
} as const;

export default function ForgotPasswordFlow() {
  const [step, setStep] = useState<Step>({ name: 'email' });
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  async function handleEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = normalizeEmail(email);
    const emailError = validateEmail(value);
    setFieldErrors({ email: emailError ?? undefined });
    setError(null);
    if (emailError) return;

    setPending(true);
    try {
      const res = await forgotPassword(value);
      setStep({ name: 'otp', email: value, resendAfter: res?.resend_after });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleReset(e: FormEvent<HTMLFormElement>, resetToken: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('new_password') ?? '');
    const confirm = String(form.get('confirm_new_password') ?? '');

    const nextErrors = {
      password: validatePassword(password) ?? undefined,
      confirm: confirm === password ? undefined : 'Passwords do not match.'
    };
    setFieldErrors(nextErrors);
    setError(null);
    if (nextErrors.password || nextErrors.confirm) return;

    setPending(true);
    try {
      await resetPassword(resetToken, password);
      setStep({ name: 'done' });
    } catch (err) {
      // An expired or used reset token means starting over from the email step.
      setError(errorMessage(err));
      if (err instanceof AuthApiError && err.fieldErrors.password) setFieldErrors({ password: err.fieldErrors.password });
    } finally {
      setPending(false);
    }
  }

  const header = STEP_HEADERS[step.name];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <AuthCardHeader icon={header.icon} title={header.title} subtitle={header.subtitle} />

      <div className="mt-6">
        {step.name === 'email' && (
          <form onSubmit={handleEmail} className="space-y-5" noValidate>
            {error && <FormAlert>{error}</FormAlert>}
            <AuthField
              id="email"
              label="Email address"
              icon="mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoFocus
            />
            <SubmitButton pending={pending} pendingLabel="Sending code…">
              Send reset code
            </SubmitButton>
          </form>
        )}

        {step.name === 'otp' && (
          <OtpStep
            email={step.email}
            submitLabel="Verify code"
            resendAfter={step.resendAfter}
            onVerify={async (otp) => {
              const { reset_token } = await verifyForgotPasswordOtp(step.email, otp);
              setError(null);
              setFieldErrors({});
              setStep({ name: 'reset', resetToken: reset_token });
            }}
            onResend={async () => (await forgotPassword(step.email))?.resend_after}
            onChangeEmail={() => setStep({ name: 'email' })}
          />
        )}

        {step.name === 'reset' && (
          <form onSubmit={(e) => handleReset(e, step.resetToken)} className="space-y-5" noValidate>
            {error && (
              <FormAlert>
                {error}{' '}
                <button type="button" onClick={() => setStep({ name: 'email' })} className="font-semibold underline">
                  Start over
                </button>
              </FormAlert>
            )}
            <PasswordField
              id="new_password"
              label="New password"
              autoComplete="new-password"
              error={fieldErrors.password}
              hint="At least 8 characters, with a letter and a number."
              autoFocus
            />
            <PasswordField
              id="confirm_new_password"
              label="Confirm new password"
              autoComplete="new-password"
              error={fieldErrors.confirm}
            />
            <SubmitButton pending={pending} pendingLabel="Updating…">
              Update password
            </SubmitButton>
          </form>
        )}

        {step.name === 'done' && (
          <div className="space-y-5">
            <FormAlert tone="success">
              Your password has been changed and you’ve been logged out of all devices. Your old password no longer works.
            </FormAlert>
            <Link
              href="/auth?tab=login"
              className="flex w-full items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Go to login
            </Link>
          </div>
        )}
      </div>

      {step.name !== 'done' && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered it?{' '}
          <Link href="/auth?tab=login" className="font-semibold text-brand-600 hover:text-brand-700">
            Back to login
          </Link>
        </p>
      )}
    </div>
  );
}
