import Image from 'next/image';
import { useTranslations } from 'next-intl';

const ICONS = {
  installation: '/images/icons/installation.svg',
  reliable: '/images/icons/reliable.svg',
  doorstep: '/images/icons/doorstep.svg',
  warranty: '/images/icons/warrenty.svg'
} as const;

function FeatureIcon({ icon }: { icon: keyof typeof ICONS }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100">
      <Image src={ICONS[icon]} alt="" width={48} height={48} className="h-10 w-10" />
    </span>
  );
}

export default function BookingSection() {
  const t = useTranslations('Booking');

  const items: { icon: keyof typeof ICONS; title: string; description: string }[] = [
    { icon: 'installation', title: t('item1Title'), description: t('item1Description') },
    { icon: 'reliable', title: t('item2Title'), description: t('item2Description') },
    { icon: 'doorstep', title: t('item3Title'), description: t('item3Description') },
    { icon: 'warranty', title: t('item4Title'), description: t('item4Description') }
  ];

  return (
    <section
      className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-cover bg-center py-24 sm:py-32"
      style={{ backgroundImage: "url('/images/booking-bg.jpg')" }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{t('heading')}</h2>

          <div className="mt-8 space-y-8">
            {items.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <FeatureIcon icon={item.icon} />
                <div>
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: car + pin + booking calendar visual — provided separately */}
        <div />
      </div>
    </section>
  );
}
