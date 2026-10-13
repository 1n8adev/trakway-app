'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const AUTOPLAY_MS = 3500;

export default function ProductGallery({ images, productName }: { images: string[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const canAutoplay = images.length > 1;

  useEffect(() => {
    if (!canAutoplay) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % images.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [canAutoplay, images.length]);

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
        <Image
          key={images[activeIndex]}
          src={images[activeIndex]}
          alt={productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-6 grid grid-cols-3 gap-4 align-middle sm:grid-cols-4">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1} of ${productName}`}
              aria-current={index === activeIndex}
              className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-white transition ${
                index === activeIndex ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-200'
              }`}
            >
              <Image src={image} alt="" fill sizes="150px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
