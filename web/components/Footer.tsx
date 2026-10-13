import type { ReactNode } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import NewsletterForm from './NewsletterForm';

function StoreBadge({ eyebrow, name, icon }: { eyebrow: string; name: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white">
      {icon}
      <span className="leading-tight">
        <span className="block text-[10px] text-gray-300">{eyebrow}</span>
        <span className="block text-sm font-semibold">{name}</span>
      </span>
    </div>
  );
}

export default function Footer() {
  const t = useTranslations('Footer');

  const navLinks = [
    { label: t('navAboutUs'), href: '#' },
    { label: t('navTestimonials'), href: '/#testimonials' },
    { label: t('navWorkWithUs'), href: '/#contact' },
    // { label: t('navFaq'), href: '/#faq' },
    // { label: t('privacyPolicy'), href: '/privacy-policy' },
    // { label: t('dataSafety'), href: '/data-safety' },
    
  ];

  return (
    <footer className="relative">
      <div className="relative z-10 mx-auto -mb-24 max-w-7xl px-4">
        <div className="grid items-center gap-8 rounded-3xl bg-white p-8 shadow-xl sm:p-10 md:grid-cols-2">
             <div className="relative mx-auto w-full max-w-[600px]">
            <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-50" />
            <Image
              src="/images/app-store.png"
              alt="Trak Way mobile app"
              width={917}
              height={872}
              className="mx-auto "
            />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-ink-700">
              <span className="block">{t('ctaHeadingLine1')}</span>
              <span className="block">{t('ctaHeadingLine2')}</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm text-gray-500">{t('ctaSubtitle')}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Image
              src="/images/google-play-store.png"
              alt="Trak Way mobile app"
              width={226}
              height={71}
              className="mx-auto"
            />
               <Image
              src="/images/apple-play-store.png"
              alt="Trak Way mobile app"
              width={220}
              height={70}
              className="mx-auto "
            />
            </div>
          </div>

       
        </div>
      </div>

      <div className="bg-[#323333] pt-32 pb-10 text-gray-300">
        <div className="mx-auto lg:max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-6 pb-6 flex-col md:flex-row">
            <Image
              src="/images/trakway-technologies.png"
              alt="Trak Way Technologies"
              width={858}
              height={205}
              className="h-16 w-auto"
            />

            <div>
              <p className="font-600 text-white text-2xl">{t('locationLabel')}</p>
              <p className="text-sm text-white">{t('locationValue')}</p>
            </div>

            <div>
              <p className="font-600 text-white text-2xl">{t('emailLabel')}</p>
              <p className="text-sm text-white">{t('emailValue')}</p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-10">
            <div className="grid gap-10 md:grid-cols-3 text-center md:text-start">
              <div>
                <h3 className="font-600 text-white text-2xl mb-4">{t('openingHoursHeading')}</h3>
                <p className="mt-3 text-md text-white">{t('openingHoursLine1')}</p>
                <p className="mt-1 text-sm text-white">{t('openingHoursLine2')}</p>
              </div>

              <div>
                <h3 className="font-600 text-white text-2xl mb-4">{t('navigationHeading')}</h3>
                <ul className="mt-3 space-y-2">
                  {navLinks.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-md text-white hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-600 text-white text-2xl mb-4">{t('newsletterHeading')}</h3>
                <div className="mt-3">
                  <NewsletterForm placeholder={t('newsletterPlaceholder')} buttonLabel={t('newsletterButton')} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 md:pt-12 text-center text-gray-400 md:flex-row md:text-start">
            <p className="block">
              {t('copyrightText', { year: new Date().getFullYear() })}
            </p>
            <p>
              <Link href="/privacy-policy" className="hover:text-white">
                {t('privacyPolicy')}
              </Link>
              {' | '}
              <Link href="/data-safety" className="hover:text-white">
                {t('dataSafety')}
              </Link>
              {' | '}
              <Link href="#" className="hover:text-white">
                {t('termsConditions')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
