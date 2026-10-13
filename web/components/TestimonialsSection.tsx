"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import StarRating from "./StarRating";

export default function TestimonialsSection() {
  const t = useTranslations("Testimonials");
  const trackRef = useRef<HTMLDivElement>(null);

  const items = [1, 2, 3, 4, 5].map((n) => ({
    name: t(`item${n}Name`),
    quote: t(`item${n}Quote`),
    rating: Number(t(`item${n}Rating`)),
  }));

  function scroll(direction: 1 | -1) {
    trackRef.current?.scrollBy({
      left: direction * trackRef.current.clientWidth * 0.9,
      behavior: "smooth",
    });
  }

  return (
    <section id="testimonials" className="pt-16 md:py-16">
      <div className="mx-auto lg:max-w-7xl px-4">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-brand-600">{t("label")}</p>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold text-gray-900 sm:text-4xl">
              {t("heading")}
            </h2>
          </div>

          <div className="text-right">
            <p className="text-3xl font-extrabold text-brand-600">
              4.9<span className="align-top text-xl">★</span>
            </p>
            <p className="text-sm text-gray-500">{t("averageRatingLabel")}</p>
          </div>
        </div>
        <div className="relative mt-8">
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <div
                key={item.name}
                className="w-full shrink-0 snap-start rounded-2xl bg-gray-100 p-6 sm:w-[calc(50%-0.75rem)]"
              >
                <p className="text-sm leading-relaxed text-gray-600">
                  {item.quote}
                </p>
                <p className="mt-4 font-bold text-gray-900">{item.name}</p>
                <StarRating rating={item.rating} className="mt-1" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous testimonials"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand-600 hover:text-brand-600"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Next testimonials"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand-600 hover:text-brand-600"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div />
    </section>
  );
}
