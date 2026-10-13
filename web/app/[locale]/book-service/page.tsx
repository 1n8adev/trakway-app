import { Fragment } from 'react';
import BookServiceForm from '@/components/book-service/BookServiceForm';
import { fetchServiceBookingOptions } from '@/lib/api';
import { BookServiceIconGlyph, type BookServiceIcon } from '@/components/book-service/icons';

const introItems: { icon: BookServiceIcon; title: string; description: string }[] = [
  { icon: 'wrench', title: 'Expert Installation', description: 'Trained professionals at your service' },
  { icon: 'clock', title: 'Quick & Reliable', description: 'Fast installation in 30-60 minutes' },
  { icon: 'truck', title: 'Doorstep Service', description: 'We come to you, wherever you are' },
  { icon: 'shieldBadge', title: 'Support & Warranty', description: 'Complete support with warranty' }
];

const services: { icon: BookServiceIcon; title: string; description: string }[] = [
  { icon: 'tools', title: 'GPS Installation', description: 'Professional GPS device installation for your vehicle' },
  { icon: 'gear', title: 'Device Replacement', description: 'Replace your old GPS device with a new one' },
  { icon: 'wrench', title: 'Troubleshooting', description: 'Fix issues and get your device working perfectly' },
  { icon: 'mapPin', title: 'Device Relocation', description: 'Relocate your GPS device to a new vehicle' },
  { icon: 'shieldCheck', title: 'Annual Maintenance', description: 'Keep your device in top condition all year round' }
];

const steps: { icon: BookServiceIcon; title: string; description: string }[] = [
  { icon: 'clipboard', title: 'Choose Service', description: 'Select the service you need for your vehicle' },
  { icon: 'car', title: 'Fill Details', description: 'Provide your vehicle and contact details' },
  { icon: 'calendar', title: 'Schedule & Confirm', description: "Choose date & time. We'll take care of the rest!" }
];

const stats: { icon: BookServiceIcon; value: string; label: string }[] = [
  { icon: 'users', value: '5000+', label: 'Happy Customers' },
  { icon: 'mapPin', value: '50+', label: 'Cities Covered' },
  { icon: 'clock', value: '30-60 Min', label: 'Installation Time' },
  { icon: 'shieldCheck', value: '100%', label: 'Customer Satisfaction' }
];

// Dashed arc with an arrow badge linking two step cards (desktop only).
function StepConnector() {
  return (
    <div className="relative mt-[7.5rem] hidden h-10 w-20 shrink-0 lg:block xl:w-28" aria-hidden="true">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <path
          d="M0 40 Q50 -40 100 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
          className="text-brand-500"
        />
      </svg>
      <span className="absolute top-0 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white shadow-md ring-4 ring-brand-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

// Map pin with a dashed trail, used as corner decoration.
function MapPinTrail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 110" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 106 C30 70 50 60 80 70 S130 85 150 40"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5 6"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M150 4c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16Z"
        fill="currentColor"
        opacity="0.55"
      />
      <circle cx="150" cy="20" r="6" fill="white" />
    </svg>
  );
}

export default async function BookServicePage() {
  const bookingOptions = await fetchServiceBookingOptions();

  return (
    <div>
      {/* Hero + booking form */}
      <section className="bg-gray-bread w-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/booking-bg2.png')" }}>


        
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-brand-600 uppercase">
              <BookServiceIconGlyph icon="pin" className="h-4 w-4" />
              GPS Service Booking
            </p>
            <h1 className="mt-3 text-4xl leading-tight font-extrabold text-gray-900 sm:text-5xl">
              Book GPS Service
              <br />
              Quick &amp; Easy
            </h1>
            <p className="mt-4 max-w-md text-gray-500">
              Professional installation, setup and support for your vehicle tracking needs.
            </p>

            <div className="mt-8 space-y-6">
              {introItems.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <BookServiceIconGlyph icon={item.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

        
          </div>

          <BookServiceForm options={bookingOptions} />
        </div>
      </section>

      {/* Services grid */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">Our Services</p>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Choose the Service You Need
            </h2>
            <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-brand-600" />
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {services.map((service) => (
              <div key={service.title} className="text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <BookServiceIconGlyph icon={service.icon} className="h-9 w-9" />
                </span>
                <h3 className="mt-4 font-bold text-gray-900">{service.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden bg-gray-bread">
        {/* Decorative blobs + map pins */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-brand-100/60" />
        <div className="pointer-events-none absolute -right-24 -bottom-28 h-72 w-72 rounded-full bg-brand-100/60" />
        <MapPinTrail className="pointer-events-none absolute top-6 right-6 hidden h-28 w-44 text-brand-500/70 lg:block" />
        <MapPinTrail className="pointer-events-none absolute bottom-6 left-4 hidden h-28 w-44 -scale-x-100 text-brand-500/70 lg:block" />

        <div className="relative mx-auto max-w-7xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="flex items-center justify-center gap-3 text-sm font-bold tracking-[0.2em] text-brand-600 uppercase">
              <span className="h-0.5 w-6 bg-brand-600" />
              How It Works
              <span className="h-0.5 w-6 bg-brand-600" />
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">Simple 3 Step Booking Process</h2>
            <p className="mt-4 text-gray-600">Get your vehicle booked in just a few clicks. Fast, easy and hassle-free!</p>
          </div>

          <div className="mx-auto mt-6 flex max-w-6xl flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-0">
            {steps.map((step, index) => (
              <Fragment key={step.title}>
                <div className="relative flex-1 pt-14">
                  <div className="relative h-full rounded-3xl bg-white/70 px-6 pt-20 pb-10 text-center shadow-[0_10px_30px_-12px_rgba(250,128,29,0.25)]">
                    {/* Icon circle overlapping the card's top edge */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="rounded-full bg-white/80 p-2 shadow-[0_6px_20px_-6px_rgba(250,128,29,0.35)]">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                          <BookServiceIconGlyph icon={step.icon} className="h-11 w-11" />
                        </div>
                      </div>
                      <span className="absolute top-0 -left-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white ring-4 ring-white/80">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">{step.title}</h3>
                    <p className="mx-auto mt-3 max-w-60 text-gray-600">{step.description}</p>

                    <span className="absolute bottom-0 left-1/2 h-1.5 w-24 -translate-x-1/2 rounded-t-full bg-brand-600" />
                  </div>
                </div>

                {index < steps.length - 1 && <StepConnector />}
              </Fragment>
            ))}
          </div>

            {/* <div className="mt-12 grid grid-cols-2 gap-6 border-t border-brand-200/60 pt-8 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-center gap-2 text-center sm:justify-start">
                  <BookServiceIconGlyph icon={stat.icon} className="h-5 w-5 shrink-0 text-brand-600" />
                  <div className="text-left">
                    <p className="font-extrabold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div> */}
        </div>
      </section>
    </div>
  );
}
