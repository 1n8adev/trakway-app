import Image from 'next/image';

export default function HeroVideo() {
  return (
    <div className="mx-auto lg:max-w-7xl px-4">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        {/* TODO: video temporarily hidden — swap back in once ready.
        <video
          src="/images/trakway-tech.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="aspect-video w-full object-cover"
        />
        */}
        <Image
          src="/images/banner/trakway-technologies.png"
          alt="Trakway Technologies"
          width={1983}
          height={793}
          className="h-auto w-full"
          priority
        />
      </div>
    </div>
  );
}
