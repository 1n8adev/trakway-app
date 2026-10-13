import { useTranslations } from 'next-intl';
import ContactForm from '@/components/ContactForm';

export default function ContactPage() {
  const t = useTranslations('Contact');

  return (
    <div>
      <section className="bg-brand-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:items-start">
          <div>
            <svg
              className="h-10 w-10 text-gray-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0-.966.784-1.75 1.75-1.75h16c.966 0 1.75.784 1.75 1.75v10.5c0 .966-.784 1.75-1.75 1.75H4A1.75 1.75 0 0 1 2.25 17.25V6.75Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="m3 6.5 9 6.25L21 6.5" />
            </svg>

            <h1 className="mt-6 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {t('subheading')}
            </h1>

            <a
              href={`mailto:${t('emailValue')}`}
              className="mt-3 inline-block text-xl font-bold text-brand-600 underline decoration-2 underline-offset-4 hover:text-brand-700 sm:text-2xl"
            >
              {t('emailValue')}
            </a>

            <p className="mt-4 text-sm font-semibold text-gray-700">{t('orFormText')}</p>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{t('heading')}</h2>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d244.6881922182821!2d77.2954172729968!3d11.112552177360195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba907d02a63e27f%3A0x9e584043f0898c22!2sHITECH%20SOLUTIONS%20-%20VLTD%20AIS140%20GPS%20FOR%20ALL%20RTO!5e0!3m2!1sen!2sin!4v1787969831154!5m2!1sen!2sin"
          className="h-[400px] w-full rounded-2xl border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Trakway Technologies location"
        />

   
      </section>
    </div>
  );
}
