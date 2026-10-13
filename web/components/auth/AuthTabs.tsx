'use client';

import { useState, type FormEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import {
  AuthApiError,
  login,
  normalizeEmail,
  register,
  resendRegistrationOtp,
  validateEmail,
  validatePassword,
  validatePhone,
  verifyRegistration
} from '@/lib/auth';
import { AuthCardHeader, AuthField, FormAlert, PasswordField, SubmitButton } from './fields';
import OtpStep from './OtpStep';

export type AuthTab = 'login' | 'register';

type FieldErrors = Record<string, string | undefined>;

function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

function value(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}

// Splits an API failure into field errors and a form-level message.
function apiErrors(error: unknown): { fields: FieldErrors; message: string | null } {
  if (!(error instanceof AuthApiError)) return { fields: {}, message: 'Something went wrong. Please try again.' };
  const fields = error.fieldErrors;
  return { fields, message: Object.keys(fields).length ? null : error.message };
}

function LoginForm({ email, onSuccess, onEmailChange }: { email: string; onSuccess: () => void; onEmailChange: (email: string) => void }) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailValue = normalizeEmail(value(form, 'login_email'));
    const password = String(form.get('login_password') ?? '');

    const nextErrors = { email: validateEmail(emailValue) ?? undefined, password: password ? undefined : 'Password is required.' };
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) return;

    setPending(true);
    try {
      await login(emailValue, password);
      onSuccess();
    } catch (error) {
      const { fields, message } = apiErrors(error);
      setErrors(fields);
      setFormError(message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && <FormAlert>{formError}</FormAlert>}

      <AuthField
        id="login_email"
        label="Email address"
        icon="mail"
        type="email"
        autoComplete="email"
        defaultValue={email}
        onChange={(e) => onEmailChange(e.target.value)}
        error={errors.email}
      />

      <PasswordField
        id="login_password"
        label="Password"
        autoComplete="current-password"
        error={errors.password}
        labelAside={
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        }
      />

      <SubmitButton pending={pending} pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}

function RegisterForm({
  email,
  onSuccess,
  onEmailChange,
  onSwitchToLogin
}: {
  email: string;
  onSuccess: () => void;
  onEmailChange: (email: string) => void;
  onSwitchToLogin: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  // Set once the OTP has been emailed; switches the card to the verify step.
  const [otpSent, setOtpSent] = useState<{ email: string; resendAfter?: number } | null>(null);
  // Kept so "Change email" brings back what the customer typed.
  const [draft, setDraft] = useState({ name: '', phone: '' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      name: value(form, 'name'),
      email: normalizeEmail(value(form, 'register_email')),
      phone: value(form, 'phone'),
      password: String(form.get('register_password') ?? '')
    };
    const confirm = String(form.get('confirm_password') ?? '');
    setDraft({ name: input.name, phone: input.phone });

    const nextErrors: FieldErrors = {
      name: input.name ? undefined : 'Name is required.',
      email: validateEmail(input.email) ?? undefined,
      phone: validatePhone(input.phone) ?? undefined,
      password: validatePassword(input.password) ?? undefined,
      confirm_password: confirm === input.password ? undefined : 'Passwords do not match.'
    };
    setErrors(nextErrors);
    setFormError(null);
    setAlreadyRegistered(false);
    if (hasErrors(nextErrors)) return;

    setPending(true);
    try {
      const res = await register({ ...input, phone: input.phone || undefined });
      setOtpSent({ email: res?.email ?? input.email, resendAfter: res?.resend_after });
    } catch (error) {
      const { fields, message } = apiErrors(error);
      setErrors(fields);
      setFormError(message);
      setAlreadyRegistered(error instanceof AuthApiError && error.status === 409);
    } finally {
      setPending(false);
    }
  }

  if (otpSent) {
    return (
      <OtpStep
        email={otpSent.email}
        submitLabel="Verify & create account"
        resendAfter={otpSent.resendAfter}
        onVerify={async (otp) => {
          await verifyRegistration(otpSent.email, otp);
          onSuccess();
        }}
        onResend={async () => (await resendRegistrationOtp(otpSent.email))?.resend_after}
        onChangeEmail={() => setOtpSent(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && (
        <FormAlert>
          {formError}
          {alreadyRegistered && (
            <>
              {' '}
              <button type="button" onClick={onSwitchToLogin} className="font-semibold underline">
                Log in instead
              </button>
            </>
          )}
        </FormAlert>
      )}

      <AuthField id="name" label="Full name" icon="user" autoComplete="name" defaultValue={draft.name} error={errors.name} />

      <AuthField
        id="register_email"
        label="Email address"
        icon="mail"
        type="email"
        autoComplete="email"
        defaultValue={email}
        onChange={(e) => onEmailChange(e.target.value)}
        error={errors.email}
      />

      <AuthField
        id="phone"
        label="Mobile number (optional)"
        icon="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={draft.phone}
        error={errors.phone}
      />

      <PasswordField
        id="register_password"
        label="Password"
        autoComplete="new-password"
        error={errors.password}
        hint="At least 8 characters, with a letter and a number."
      />

      <PasswordField
        id="confirm_password"
        label="Confirm password"
        autoComplete="new-password"
        error={errors.confirm_password}
      />

      <SubmitButton pending={pending} pendingLabel="Sending code…">
        Create account
      </SubmitButton>
    </form>
  );
}

export default function AuthTabs({ initialTab, redirectTo }: { initialTab: AuthTab; redirectTo: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  // Shared so switching tabs keeps the email the customer already typed.
  const [email, setEmail] = useState('');

  function selectTab(next: AuthTab) {
    setTab(next);
    // Keep the URL shareable without triggering a server round-trip.
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  }

  function handleSuccess() {
    router.replace(redirectTo);
    router.refresh();
  }

  const tabs: { id: AuthTab; label: string }[] = [
    { id: 'login', label: 'Log in' },
    { id: 'register', label: 'Register' }
  ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <AuthCardHeader
        icon={tab === 'login' ? 'lock' : 'user'}
        title={tab === 'login' ? 'Welcome back' : 'Create your account'}
        subtitle={tab === 'login' ? 'Log in to manage your orders and devices' : 'Register to book services and track orders'}
      />

      <div role="tablist" aria-label="Account" className="mt-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => selectTab(id)}
            className={`rounded-md py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === 'login' ? (
          <LoginForm email={email} onEmailChange={setEmail} onSuccess={handleSuccess} />
        ) : (
          <RegisterForm email={email} onEmailChange={setEmail} onSuccess={handleSuccess} onSwitchToLogin={() => selectTab('login')} />
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {tab === 'login' ? 'New to Trakway? ' : 'Already have an account? '}
        <button
          type="button"
          onClick={() => selectTab(tab === 'login' ? 'register' : 'login')}
          className="font-semibold text-brand-600 hover:text-brand-700"
        >
          {tab === 'login' ? 'Create an account' : 'Log in'}
        </button>
      </p>
    </div>
  );
}
