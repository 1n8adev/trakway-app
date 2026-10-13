import { getTranslations } from 'next-intl/server';

export default async function DataSafetyPage() {
  const t = await getTranslations('DataSafety');

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
        <p className="text-sm text-gray-500">Last Updated: September 18, 2026</p>

        <p className="mt-6 leading-relaxed">
          At <strong>Trakway Technologies</strong>, protecting vehicle tracking and customer
          information is an important part of our service.
        </p>
        <p className="mt-4 leading-relaxed">
          Our GPS devices, mobile application, web dashboard, and supporting systems are designed to
          securely transmit and process vehicle tracking information.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">1. What Data We Protect</h2>
        <p className="mt-3 leading-relaxed">
          Depending on the services you use, the information we protect may include:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Vehicle GPS location</li>
          <li>Vehicle registration details</li>
          <li>GPS device identification information</li>
          <li>Vehicle speed and direction</li>
          <li>Trip and route history</li>
          <li>Ignition and vehicle status</li>
          <li>Geofence and alert information</li>
          <li>Customer account information</li>
          <li>Name, mobile number, and email address</li>
          <li>Device and application information</li>
          <li>Technical and diagnostic information</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold text-gray-900">2. Secure Communication</h2>
        <p className="mt-3 leading-relaxed">
          Trakway Technologies uses reasonable security measures to protect information while it is
          transmitted between GPS tracking devices, our servers, mobile applications, and web
          platforms.
        </p>
        <p className="mt-3 leading-relaxed">
          Where appropriate, secure communication technologies and encryption may be used to reduce
          the risk of unauthorized interception or modification.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">3. Account Security</h2>
        <p className="mt-3 leading-relaxed">
          Access to vehicle tracking information is restricted to authorized users.
        </p>
        <p className="mt-3 leading-relaxed">We use reasonable measures such as:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Account authentication</li>
          <li>Access controls</li>
          <li>User permissions</li>
          <li>Secure passwords or authentication mechanisms</li>
          <li>System monitoring</li>
          <li>Administrative controls</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Customers should keep their account credentials confidential and should not share login
          information with unauthorized persons.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">
          4. Protection of Vehicle Location Data
        </h2>
        <p className="mt-3 leading-relaxed">
          Vehicle location data can reveal information about the movement and usage of a vehicle.
        </p>
        <p className="mt-3 leading-relaxed">
          We therefore take reasonable precautions to protect vehicle location and tracking
          information from unauthorized access.
        </p>
        <p className="mt-3 leading-relaxed">
          Access to tracking information is intended for authorized account users and
          administrators.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">5. Secure Data Storage</h2>
        <p className="mt-3 leading-relaxed">
          Tracking and account information may be stored on secure servers or cloud infrastructure
          operated by Trakway Technologies or trusted technology service providers.
        </p>
        <p className="mt-3 leading-relaxed">
          We use reasonable technical and organizational measures designed to protect stored
          information against unauthorized access, alteration, loss, or destruction.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">6. Limited Access</h2>
        <p className="mt-3 leading-relaxed">
          Access to customer and vehicle data is limited according to business and operational
          requirements.
        </p>
        <p className="mt-3 leading-relaxed">
          Our personnel and authorized service providers may access information only when reasonably
          necessary for purposes such as:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Providing customer support</li>
          <li>Maintaining GPS devices</li>
          <li>Troubleshooting technical problems</li>
          <li>Maintaining our systems</li>
          <li>Providing requested services</li>
          <li>Protecting the security of our platform</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold text-gray-900">7. Third-Party Technology Providers</h2>
        <p className="mt-3 leading-relaxed">
          Trakway Technologies may use trusted third-party providers for infrastructure and service
          functions, including:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Cloud hosting</li>
          <li>Maps and location services</li>
          <li>SMS and notifications</li>
          <li>Email services</li>
          <li>Payment services</li>
          <li>Security and monitoring</li>
          <li>Technical infrastructure</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          We take reasonable steps to ensure that service providers handling information on our
          behalf maintain appropriate security and confidentiality.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">8. Data Retention and Deletion</h2>
        <p className="mt-3 leading-relaxed">
          We retain data for the period reasonably necessary to provide our services, maintain
          business records, support customers, address disputes, protect our systems, and comply
          with applicable legal requirements.
        </p>
        <p className="mt-3 leading-relaxed">
          When data is no longer required, we may delete, anonymize, or securely dispose of it
          according to our applicable practices.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">9. Security Monitoring</h2>
        <p className="mt-3 leading-relaxed">
          We may monitor our systems and infrastructure for security threats, unauthorized access,
          unusual activity, and technical problems.
        </p>
        <p className="mt-3 leading-relaxed">
          Security logs and technical information may be retained where necessary for security,
          troubleshooting, compliance, and incident investigation.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">10. Security Incidents</h2>
        <p className="mt-3 leading-relaxed">
          If we identify a security incident affecting our systems or information, we will take
          reasonable steps to investigate and respond to the incident.
        </p>
        <p className="mt-3 leading-relaxed">
          Where applicable, we will comply with relevant legal and regulatory requirements concerning
          cyber-security incidents and data protection.
        </p>
        <p className="mt-3 leading-relaxed">
          CERT-In has issued directions covering cyber-security practices and reporting of specified
          cyber incidents in India.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">11. Customer Responsibility</h2>
        <p className="mt-3 leading-relaxed">Customers using Trakway Technologies are responsible for:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Protecting their account credentials</li>
          <li>Giving access only to authorized users</li>
          <li>Keeping mobile phones and computers used to access the service secure</li>
          <li>Removing access for employees or users who no longer require it</li>
          <li>Ensuring that vehicle tracking is used lawfully</li>
          <li>
            Ensuring that appropriate permissions, notices, or contractual arrangements are in place
            where required
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-bold text-gray-900">12. Continuous Improvement</h2>
        <p className="mt-3 leading-relaxed">Cybersecurity is an ongoing process.</p>
        <p className="mt-3 leading-relaxed">
          Trakway Technologies may periodically review and improve its security controls, systems,
          procedures, and technologies to help protect customer and vehicle information.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">13. Contact Us</h2>
        <p className="mt-3 leading-relaxed">
          If you believe your Trakway account or vehicle tracking information has been accessed
          without authorization, please contact us immediately.
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
      </div>
    </div>
  );
}
