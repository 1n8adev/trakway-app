import Image from 'next/image';

const LOGOS = [
  '/images/clients/client1.png',
  '/images/clients/client2.png',
  '/images/clients/client3.png',
  '/images/clients/client4.png',
  '/images/clients/client5.png',
  '/images/clients/client6.png',
  '/images/clients/client7.png'
];

export default function ClientLogos() {
  return (
    <div className="mx-auto max-w-7xl overflow-hidden py-8 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-16">
        {[...LOGOS, ...LOGOS].map((src, i) => (
          <Image
            key={i}
            src={src}
            alt="Client logo"
            width={250}
            height={55}
            className="h-16 w-auto shrink-0 object-contain opacity-70 grayscale"
          />
        ))}
      </div>
    </div>
  );
}
