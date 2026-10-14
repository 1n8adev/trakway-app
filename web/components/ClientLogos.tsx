import Image from 'next/image';
import { fetchClientLogos, type ClientLogo } from '@/lib/api';

// Scrolling logo strip under the hero. Logos come from GET /api/client-logos (managed in
// the admin panel). If the backend is unreachable or has no logos, the strip is skipped.
export default async function ClientLogos() {
  let logos: ClientLogo[] = [];
  try {
    logos = await fetchClientLogos();
  } catch (error) {
    console.error('Failed to load client logos', error);
  }

  if (logos.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl overflow-hidden py-8 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-16">
        {/* The list is rendered twice so the marquee loops seamlessly; the copy is hidden from screen readers. */}
        {[logos, logos].map((set, copy) =>
          set.map((logo) => (
            <Image
              key={`${copy}-${logo.id}`}
              src={logo.image}
              alt={copy === 0 ? logo.name : ''}
              aria-hidden={copy === 1 || undefined}
              width={250}
              height={55}
              className="h-16 w-auto shrink-0 object-contain opacity-70 grayscale"
            />
          ))
        )}
      </div>
    </div>
  );
}
