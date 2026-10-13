import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import MissionNav from '@/components/about/MissionNav';
import CardCarousel from '@/components/about/CardCarousel';
import { BookServiceIconGlyph, type BookServiceIcon } from '@/components/book-service/icons';

const CLIENT_LOGOS = [1, 2, 3, 4, 5, 6, 7].map((n) => `/images/clients/client${n}.png`);

// Mission principles: each is a scroll target for the sticky pill nav.
const principles = [
  {
    id: 'visibility',
    label: 'Real-time visibility',
    title: 'Visibility.',
    text: 'Every vehicle and every trip should be visible the moment it happens. Live location, routes and alerts come together in one simple app, so you always know where things stand.'
  },
  {
    id: 'reliability',
    label: 'Reliable hardware',
    title: 'Reliability.',
    text: 'Tracking is only useful if it works every day. We choose tested, AIS-140 ready devices and back them with a warranty and quick replacements.'
  },
  {
    id: 'safety',
    label: 'Safety first',
    title: 'Safety.',
    text: 'From instant alerts to remote engine cut-off, our features are built to protect drivers, vehicles and the people who depend on them.'
  },
  {
    id: 'support',
    label: 'Doorstep support',
    title: 'Support.',
    text: 'Our technicians install and service devices at your doorstep, and a real support team is a call away whenever you need help.'
  }
];

const solving: { icon: BookServiceIcon; title: string; text: string; className: string }[] = [
  {
    icon: 'mapPin',
    title: 'Lost track of vehicles',
    text: 'Live GPS location, trip history and geofence alerts show exactly where every vehicle is — and where it has been.',
    className: 'bg-amber-200'
  },
  {
    icon: 'shieldCheck',
    title: 'Theft and misuse',
    text: 'Geofence alerts and remote engine cut-off help you act the moment something looks wrong.',
    className: 'bg-pink-200'
  },
  {
    icon: 'gear',
    title: 'Unclear fleet usage',
    text: 'Trip history and travel logs show how every vehicle is really being used, so fleets can plan routes and cut wasted trips.',
    className: 'bg-sky-200'
  },
  {
    icon: 'users',
    title: 'Worry for loved ones',
    text: 'Personal trackers keep families connected to children, elders and two-wheeler riders on the move.',
    className: 'bg-emerald-200'
  },
  {
    icon: 'wrench',
    title: 'Complicated setup',
    text: 'We handle installation, activation and SIM plans end to end, so your tracking is up and running in 30–60 minutes.',
    className: 'bg-brand-100'
  }
];

const reasons = [
  { icon: '/images/icons/installation.svg', title: 'Expert installation', text: 'Trained technicians fit every device neatly and safely.' },
  { icon: '/images/icons/doorstep.svg', title: 'Doorstep service', text: 'Installation and servicing wherever your vehicles are.' },
  { icon: '/images/icons/reliable.svg', title: 'Reliable devices', text: 'Tested hardware with high network uptime across India.' },
  { icon: '/images/icons/warrenty.svg', title: 'Warranty & support', text: 'Every device is covered, with real people to help you.' }
];

export default async function AboutPage() {
  const t = await getTranslations('About');

  const stats = [1, 2, 3, 4].map((n) => ({
    value: t(`stat${n}Value` as 'stat1Value'),
    label: t(`stat${n}Label` as 'stat1Label')
  }));

  const navItems = [{ id: 'mission', label: t('missionEyebrow') }, ...principles.map(({ id, label }) => ({ id, label }))];

  return (
    <div>
      <div className="bg-gray-bread py-6 text-start">
        <div className="mx-auto px-4 lg:max-w-7xl">
          <h1 className="mb-0 text-2xl font-bold text-gray-900 text-white sm:text-3xl md:text-4xl">{t('breadcrumbCurrent')}</h1>
        </div>
      </div>

      {/* Hero: heading left, intro + CTA right, then a wide image */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:pt-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <h2 className="text-4xl leading-tight font-extrabold text-ink-700 sm:text-5xl lg:text-6xl">
            {t('heroHeadingLine1')}
            <br />
            {t('heroHeadingLine2')}
          </h2>
          <div className="lg:pb-2">
            <p className="max-w-lg text-lg leading-relaxed text-gray-600">
              Trakway Technologies builds GPS tracking for vehicles, fleets and families across India — reliable devices, a simple
              app and doorstep service, all from one team.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
            >
              Explore our products
              <BookServiceIconGlyph icon="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative mt-12 h-[260px] overflow-hidden rounded-3xl sm:h-[440px]">
          <Image src="/images/services/vehicle-tracking.jpg" alt={t('heroImageAlt')} fill sizes="(min-width: 1280px) 1248px, 100vw" className="object-cover" priority />
        </div>

        <div className="mt-12 grid grid-cols-2 gap-y-10 border-b border-gray-200 pb-14 text-center sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold text-ink-700 sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission with a sticky section nav */}
      {/* <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <MissionNav items={navItems} />
          </div>

          <div className="max-w-3xl lg:col-span-9">
            <div id="mission" className="scroll-mt-24">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{t('missionHeading')}</h2>
              <p className="mt-5 text-lg leading-relaxed text-gray-600">{t('missionParagraph')}</p>
            </div>

            <div className="mt-10 space-y-6 border-t border-gray-200 pt-10">
              {principles.map((p) => (
                <p key={p.id} id={p.id} className="scroll-mt-24 leading-relaxed text-gray-600">
                  <strong className="font-bold text-gray-900">{p.title}</strong> {p.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section> */}

      {/* What we're solving: colourful card carousel */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <CardCarousel
            heading={
              <>
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">What we’re solving</h2>
                <p className="mt-3 max-w-xl text-gray-600">
                  Everyday problems for vehicle owners, fleets and families — handled by one connected tracking platform.
                </p>
              </>
            }
          >
            {solving.map((card) => (
              <article
                key={card.title}
                className={`flex min-h-72 w-[80%] shrink-0 snap-start flex-col rounded-2xl p-6 sm:w-[46%] lg:w-[31%] ${card.className}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-gray-900">
                  <BookServiceIconGlyph icon={card.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-gray-900">{card.title}</h3>
                <p className="mt-auto pt-8 text-sm leading-relaxed text-gray-800">{card.text}</p>
              </article>
            ))}
          </CardCarousel>
        </div>
      </section>

      {/* Why Trakway: dark brand panel */}
      <section className="bg-ink-700 py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <p className="text-sm font-bold tracking-[0.2em] text-brand-600 uppercase">Why Trakway</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">The team behind every device</h2>
            <p className="mt-4 leading-relaxed text-white/70">
              Engineers, technicians and support specialists working together so your tracking simply works — from the day it is
              installed to every trip after.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Talk to our team
              <BookServiceIconGlyph icon="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {reasons.map((reason) => (
              <div key={reason.title} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white">
                  <Image src={reason.icon} alt="" width={32} height={32} className="h-8 w-8" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{reason.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{reason.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted by: client logos in circles */}
      {/* <section className="overflow-hidden bg-gray-50 py-16 sm:py-20">
        <h2 className="mx-auto max-w-2xl px-4 text-center text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Trusted by businesses across India
        </h2>
        <div className="mt-12 flex flex-wrap justify-center gap-4 px-4 sm:gap-6">
          {CLIENT_LOGOS.map((src) => (
            <div key={src} className="flex h-28 w-28 items-center justify-center rounded-full bg-white p-5 shadow-sm sm:h-36 sm:w-36 sm:p-7">
              <Image src={src} alt="Client logo" width={160} height={60} className="h-auto max-h-12 w-auto object-contain opacity-80 grayscale" />
            </div>
          ))}
        </div>
      </section> */}

      {/* Closing CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:py-24">
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold text-gray-900 sm:text-4xl">Built to scale with you</h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          From a single car to fleets of hundreds, Trakway grows with you — with the same reliable devices and support at every
          size.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/book-service"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Book a service
            <BookServiceIconGlyph icon="arrowRight" className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border-2 border-ink-700 px-7 py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-700 hover:text-white"
          >
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
}
