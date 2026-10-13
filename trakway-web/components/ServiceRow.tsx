import Image from 'next/image';

export default function ServiceRow({
  label,
  heading,
  description,
  learnMore,
  image,
  imageAlt,
  reverse
}: {
  label: string;
  heading: string;
  description: string;
  learnMore: string;
  image: string;
  imageAlt: string;
  reverse: boolean;
}) {
  return (
    <div className="grid md:grid-cols-2">
      <div className={`relative min-h-[420px] ${reverse ? 'md:order-2' : 'md:order-1'}`}>
        <Image src={image} alt={imageAlt} fill className="object-cover" />
      </div>
      <div
        className={`flex items-center bg-gray-100 px-8 py-16 sm:px-16 ${
          reverse ? 'md:order-1' : 'md:order-2'
        }`}
      >
        <div className="max-w-md">
          <p className="text-sm font-semibold text-brand-600">{label}</p>
          <h3 className="mt-2 text-3xl font-extrabold text-gray-900">{heading}</h3>
          <p className="mt-4 leading-relaxed text-gray-600">{description}</p>
          {/* <button
            type="button"
            className="mt-6 rounded-full border-2 border-brand-600 px-8 py-3 text-sm font-bold tracking-wider text-brand-600 uppercase transition hover:bg-brand-600 hover:text-white"
          >
            {learnMore}
          </button> */}
        </div>
      </div>
    </div>
  );
}
