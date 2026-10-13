import { useTranslations } from 'next-intl';
import ServiceRow from './ServiceRow';

export default function ServicesSection() {
  const t = useTranslations('Services');

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen mt-12" style={{ backgroundImage: "url('./images/services-bg.jpg')" }}>
      
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 md:text-5xl">
           Our
            <span className="text-brand-600 ms-4">Services</span>
          </h2>

        </div>

      <div id="vehicle-tracking">
        <ServiceRow
          label={t('vehicleLabel')}
          heading={t('vehicleHeading')}
          description={t('vehicleDescription')}
          learnMore={t('learnMore')}
          image="/images/services/vehicle-tracking.jpg"
          imageAlt="Vehicle tracking system"
          reverse={false}
        />
      </div>
      <div id="personal-tracking">
        <ServiceRow
          label={t('personalLabel')}
          heading={t('personalHeading')}
          description={t('personalDescription')}
          learnMore={t('learnMore')}
          image="/images/services/personal-tracking.jpg"
          imageAlt="Personal tracking"
          reverse={true}
        />
      </div>
    </section>
  );
}
