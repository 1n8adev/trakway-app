'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthApiError } from '@/lib/auth';
import { MAX_ADDRESSES, deleteAddress, listAddresses, setDefaultAddress, type Address } from '@/lib/addresses';
import { useAuthSession } from '@/components/auth/useAuthSession';
import { FormAlert } from '@/components/auth/fields';
import { BookServiceIconGlyph } from '@/components/book-service/icons';
import AddressForm from './AddressForm';

function errorMessage(error: unknown) {
  return error instanceof AuthApiError ? error.message : 'Something went wrong. Please try again.';
}

function AddressCard({
  address,
  busy,
  onEdit,
  onDelete,
  onMakeDefault
}: {
  address: Address;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
}) {
  const actionClass = 'text-sm font-semibold transition disabled:opacity-50';

  return (
    <li
      className={`flex flex-col rounded-2xl border bg-white p-5 transition ${
        address.is_default ? 'border-brand-600 ring-2 ring-brand-100' : 'border-gray-200'
      } ${busy ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-gray-900">{address.name}</p>
        {address.is_default && (
          <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">Default</span>
        )}
      </div>

      <address className="mt-2 text-sm leading-relaxed text-gray-600 not-italic">
        {address.address_line1}
        {address.address_line2 && <>, {address.address_line2}</>}
        <br />
        {address.landmark && (
          <>
            {address.landmark}
            <br />
          </>
        )}
        {address.city}, {address.state} - {address.pincode}
      </address>
      <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <BookServiceIconGlyph icon="phone" className="h-4 w-4 text-gray-400" />
        {address.phone}
      </p>

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onEdit} disabled={busy} className={`${actionClass} text-gray-700 hover:text-brand-600`}>
          Edit
        </button>
        <button type="button" onClick={onDelete} disabled={busy} className={`${actionClass} text-red-600 hover:text-red-700`}>
          Delete
        </button>
        {!address.is_default && (
          <button
            type="button"
            onClick={onMakeDefault}
            disabled={busy}
            className={`${actionClass} ml-auto text-brand-600 hover:text-brand-700`}
          >
            Set as default
          </button>
        )}
        </div>
      </div>
    </li>
  );
}

type Editor = { mode: 'add' } | { mode: 'edit'; address: Address } | null;

export default function AddressBook() {
  const session = useAuthSession();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const list = await listAddresses();
      setAddresses(list);
      setLoadError(null);
      return list;
    } catch (err) {
      setLoadError(errorMessage(err));
      return null;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Bring the form into view when it opens.
  useEffect(() => {
    if (editor) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editor]);

  // Default/delete can change other addresses too, so reload the list after each action.
  async function runAction(id: number, action: () => Promise<unknown>, success: string) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(success);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function handleDelete(address: Address) {
    if (!window.confirm(`Delete the address for ${address.name}?`)) return;
    if (editor?.mode === 'edit' && editor.address.id === address.id) setEditor(null);
    runAction(address.id, () => deleteAddress(address.id), 'Address deleted.');
  }

  async function handleSaved() {
    const wasEditing = editor?.mode === 'edit';
    setEditor(null);
    await load();
    setActionError(null);
    setNotice(wasEditing ? 'Address updated.' : 'Address saved.');
  }

  if (!addresses) {
    return loadError ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-full border-2 border-brand-600 px-6 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-600 hover:text-white"
        >
          Try again
        </button>
      </div>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
        <div className="h-52 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-52 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  const atLimit = addresses.length >= MAX_ADDRESSES;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Saved addresses</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {addresses.length} of {MAX_ADDRESSES} · Your default address is used for orders and service visits.
          </p>
        </div>
        {!editor && (
          <button
            type="button"
            onClick={() => setEditor({ mode: 'add' })}
            disabled={atLimit}
            title={atLimit ? `You can save up to ${MAX_ADDRESSES} addresses` : undefined}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>
            Add new address
          </button>
        )}
      </div>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {actionError && <FormAlert>{actionError}</FormAlert>}
      {atLimit && !editor && (
        <FormAlert tone="info">You’ve reached the limit of {MAX_ADDRESSES} addresses. Delete one to add another.</FormAlert>
      )}

      {editor && (
        <div ref={editorRef} className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 className="mb-5 text-lg font-bold text-gray-900">{editor.mode === 'edit' ? 'Edit address' : 'Add a new address'}</h3>
          <AddressForm
            key={editor.mode === 'edit' ? editor.address.id : 'new'}
            address={editor.mode === 'edit' ? editor.address : undefined}
            forceDefault={addresses.length === 0}
            defaultName={session?.user?.name ?? ''}
            defaultPhone={session?.user?.phone ?? ''}
            onSaved={handleSaved}
            onCancel={() => setEditor(null)}
          />
        </div>
      )}

      {addresses.length === 0 && !editor ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <BookServiceIconGlyph icon="pin" className="h-7 w-7" />
          </span>
          <p className="mt-4 text-lg font-bold text-gray-900">No saved addresses yet</p>
          <p className="mt-1 text-sm text-gray-500">Add an address for faster checkout. Your first one becomes the default.</p>
          <button
            type="button"
            onClick={() => setEditor({ mode: 'add' })}
            className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              busy={busyId === address.id}
              onEdit={() => {
                setNotice(null);
                setEditor({ mode: 'edit', address });
              }}
              onDelete={() => handleDelete(address)}
              onMakeDefault={() => runAction(address.id, () => setDefaultAddress(address.id), 'Default address updated.')}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
