import { getTranslations } from 'next-intl/server';

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('PrivacyPolicy');

  return (
    <div className="">
      <div className="bg-gray-bread mb-12 text-start py-6">
        <div className="mx-auto lg:max-w-7xl px-4">
          <h1 className="mb-0 text-2xl font-bold text-gray-900 text-white sm:text-3xl md:text-4xl">
            {t('heading')}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 text-gray-700">
        <p className="text-sm text-gray-500">Effective Date: September 18, 2026</p>

        <p className="mt-6 leading-relaxed">
          Trakway Technologies (&ldquo;Trakway&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
          &ldquo;our&rdquo;) is an India-based vehicle GPS tracking and fleet management technology
          company.
        </p>
        <p className="mt-4 leading-relaxed">
          This Privacy Policy explains how Trakway Technologies collects, uses, stores, processes,
          and protects information when you use the <strong>Trakway Technologies</strong> mobile
          application, GPS tracking devices, website, web dashboard, and related services
          (&ldquo;Services&rdquo;).
        </p>
        <p className="mt-4 leading-relaxed">
          By using our Services, you acknowledge that you have read and understood this Privacy
          Policy.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">1. Information We Collect</h2>
        <p className="mt-3 leading-relaxed">
          We collect information that is necessary to provide and operate our vehicle tracking
          services.
        </p>

        <h3 className="mt-6 font-bold text-gray-900">A. Account Information</h3>
        <p className="mt-2 leading-relaxed">
          When you create or use a Trakway account, we may collect:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Name</li>
          <li>Mobile number</li>
          <li>Email address</li>
          <li>Company or business name</li>
          <li>Login credentials</li>
          <li>Account and subscription information</li>
          <li>Customer support information</li>
        </ul>

        <h3 className="mt-6 font-bold text-gray-900">B. Vehicle Information</h3>
        <p className="mt-2 leading-relaxed">
          Depending on the features used, we may collect information relating to vehicles connected
          to our GPS tracking devices, including:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Vehicle registration number</li>
          <li>Vehicle name or identification</li>
          <li>GPS device/IMEI or device identification number</li>
          <li>Vehicle type</li>
          <li>Device installation information</li>
          <li>Vehicle status</li>
          <li>Ignition status</li>
          <li>Battery or device status</li>
        </ul>

        <h3 className="mt-6 font-bold text-gray-900">C. GPS and Tracking Information</h3>
        <p className="mt-2 leading-relaxed">
          Our core service requires the collection and processing of vehicle tracking information,
          which may include:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Vehicle GPS location</li>
          <li>Date and time of location records</li>
          <li>Speed</li>
          <li>Direction</li>
          <li>Distance travelled</li>
          <li>Routes and trip history</li>
          <li>Stop and parking information</li>
          <li>Geographical locations</li>
          <li>Geofence events</li>
          <li>Ignition events</li>
          <li>Other vehicle-related alerts and tracking events</li>
        </ul>

        <h3 className="mt-6 font-bold text-gray-900">D. Technical Information</h3>
        <p className="mt-2 leading-relaxed">
          We may also collect technical information required to operate and secure our Services,
          such as:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>IP address</li>
          <li>Device type</li>
          <li>Operating system</li>
          <li>Application version</li>
          <li>Browser information</li>
          <li>Device logs</li>
          <li>Network information</li>
          <li>Error and diagnostic information</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold text-gray-900">2. How We Use Your Information</h2>
        <p className="mt-3 leading-relaxed">
          We use information collected through our Services for purposes including:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Providing vehicle GPS tracking services</li>
          <li>Displaying vehicle locations on maps</li>
          <li>Providing live and historical tracking</li>
          <li>Generating trip and vehicle reports</li>
          <li>Providing speed, ignition, geofence, and other alerts</li>
          <li>Managing GPS tracking devices</li>
          <li>Maintaining customer accounts</li>
          <li>Processing subscriptions and payments</li>
          <li>Providing customer support</li>
          <li>Troubleshooting technical issues</li>
          <li>Improving the performance and functionality of our Services</li>
          <li>Protecting our systems from unauthorized access, fraud, and misuse</li>
          <li>Complying with applicable Indian laws and legal requirements</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          We process personal data for specified and lawful purposes and provide appropriate
          information about the data being processed and its purpose.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">3. Vehicle Location Data</h2>
        <p className="mt-3 leading-relaxed">
          Vehicle location data is a fundamental part of the Trakway service.
        </p>
        <p className="mt-3 leading-relaxed">
          GPS information transmitted by an installed tracking device may be processed by our
          systems and made available to authorized customers through the Trakway Technologies
          application or web dashboard.
        </p>
        <p className="mt-3 leading-relaxed">
          Trakway is primarily a technology service provider for vehicle tracking. Customers who
          install or use our GPS devices are responsible for ensuring that their use of vehicle
          tracking complies with applicable laws, contractual obligations, and any required notices
          or permissions.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">4. Sharing of Information</h2>
        <p className="mt-3 leading-relaxed">
          We may share information with trusted service providers when necessary to operate our
          Services.
        </p>
        <p className="mt-3 leading-relaxed">These may include providers of:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Cloud hosting and infrastructure</li>
          <li>GPS and mapping services</li>
          <li>SMS, email, and notification services</li>
          <li>Payment processing</li>
          <li>Technical support</li>
          <li>Software and IT infrastructure</li>
          <li>Security and monitoring services</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          We may also disclose information where required by applicable law, court order,
          government authority, or lawful request, or where necessary to protect our rights, users,
          systems, or property.
        </p>
        <p className="mt-3 leading-relaxed">
          We do not sell your personal information as a standalone business activity.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">5. Data Security</h2>
        <p className="mt-3 leading-relaxed">
          We take reasonable technical and organizational measures to protect personal and
          vehicle-related information against unauthorized access, alteration, disclosure, loss, or
          destruction.
        </p>
        <p className="mt-3 leading-relaxed">
          Security measures may include access controls, authentication, secure communication,
          system monitoring, and other appropriate safeguards.
        </p>
        <p className="mt-3 leading-relaxed">
          However, no electronic transmission or storage system can be guaranteed to be completely
          secure.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">6. Data Retention</h2>
        <p className="mt-3 leading-relaxed">
          We retain information for as long as reasonably necessary to provide our Services and for
          legitimate business, contractual, security, dispute-resolution, and legal purposes.
        </p>
        <p className="mt-3 leading-relaxed">
          Vehicle tracking history may be retained according to the customer&rsquo;s service plan,
          operational requirements, and applicable legal requirements.
        </p>
        <p className="mt-3 leading-relaxed">
          When information is no longer required, we may delete, anonymize, or otherwise dispose of
          it in accordance with our applicable retention practices.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">7. User Rights</h2>
        <p className="mt-3 leading-relaxed">
          Subject to applicable law, you may have rights relating to your personal data, including
          rights to request access to, correction of, or deletion of certain personal information.
        </p>
        <p className="mt-3 leading-relaxed">
          You may also contact us regarding questions, concerns, or complaints relating to the
          processing of your personal data.
        </p>
        <p className="mt-3 leading-relaxed">
          We may request reasonable information to verify your identity before processing certain
          requests.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">8. Account and Vehicle Administrator</h2>
        <p className="mt-3 leading-relaxed">
          If your Trakway account is created or managed by a company, fleet operator, vehicle owner,
          employer, or other organization, that organization may control the account and vehicle
          tracking information.
        </p>
        <p className="mt-3 leading-relaxed">
          In such cases, requests concerning vehicle tracking, account access, or the
          organization&rsquo;s use of the service may need to be directed to the relevant account
          administrator.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">9. Cookies and Similar Technologies</h2>
        <p className="mt-3 leading-relaxed">
          Our website and application may use cookies or similar technologies for purposes such as:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Authentication</li>
          <li>Security</li>
          <li>Remembering preferences</li>
          <li>Understanding service usage</li>
          <li>Improving website and application performance</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          You may be able to manage cookies through your browser or device settings.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">10. Third-Party Services</h2>
        <p className="mt-3 leading-relaxed">
          Our Services may use third-party technologies such as mapping, cloud hosting,
          communication, payment, analytics, or other infrastructure services.
        </p>
        <p className="mt-3 leading-relaxed">
          Third-party providers may process information according to their own terms and privacy
          policies.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">11. Children&rsquo;s Privacy</h2>
        <p className="mt-3 leading-relaxed">
          Trakway Technologies provides vehicle tracking and fleet management services and is not
          intended to be directed specifically toward children.
        </p>
        <p className="mt-3 leading-relaxed">
          We do not knowingly request personal information from children for purposes unrelated to
          providing our Services.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">12. Data Security Incidents</h2>
        <p className="mt-3 leading-relaxed">
          We maintain processes designed to identify, investigate, contain, and respond to security
          incidents.
        </p>
        <p className="mt-3 leading-relaxed">
          Where notification is required under applicable law or regulatory requirements, we will
          take appropriate steps to provide such notification.
        </p>
        <p className="mt-3 leading-relaxed">
          Organizations operating ICT systems in India may also have obligations under applicable
          CERT-In directions concerning cyber-security incident reporting and related
          information-security practices.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">13. Changes to This Privacy Policy</h2>
        <p className="mt-3 leading-relaxed">
          We may update this Privacy Policy from time to time due to changes in our Services,
          technology, business practices, or applicable legal requirements.
        </p>
        <p className="mt-3 leading-relaxed">
          The latest version will be published through the Trakway Technologies website or
          application with the updated effective date.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">14. Contact Us</h2>
        <p className="mt-3 leading-relaxed">
          For questions, privacy requests, or complaints regarding this Privacy Policy, please
          contact:
        </p>
        <p className="mt-3 leading-relaxed">
          <strong className="block text-gray-900">Trakway Technologies</strong>
          Email:{' '}
          <a href="mailto:privacy@yourdomain.com" className="text-brand-600 hover:underline">
            info@trakwaytechnologies.com
          </a>
          {/* <br />
          Phone: [Your Phone Number] */}
          <br />
          Address: No 14, Vanjipalayam Rd, near North RTO Ground, next to Ganesh Mahal, Kavilipalayam, Tiruppur, Tamil Nadu 641652
        </p>
        <p className="mt-3 leading-relaxed">
          Please include sufficient information in your request so that we can identify your
          account and respond appropriately.
        </p>
      </div>
    </div>
  );
}
