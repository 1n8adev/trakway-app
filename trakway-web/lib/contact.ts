// Business contact details shared across the site.
// TODO: replace with the real business number before launch.
export const CONTACT_PHONE = '+919876543210';

// wa.me link, optionally with a prefilled message.
export function whatsappUrl(message?: string) {
  const base = `https://wa.me/${CONTACT_PHONE.replace(/\D/g, '')}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
