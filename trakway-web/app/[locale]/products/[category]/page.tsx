import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { fetchCategories, fetchProducts, findCategoryBySlug } from "@/lib/api";
import ProductCatalog from "@/components/products/ProductCatalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = findCategoryBySlug(await fetchCategories(), slug);

  if (!category) return {};

  return {
    title: category.name,
    description: `Browse Trakway ${category.name} devices — pricing, specifications and features.`,
  };
}

export default async function ProductCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category: slug } = await params;
  const { page } = await searchParams;
  const categories = await fetchCategories();
  const category = findCategoryBySlug(categories, slug);

  if (!category) notFound();

  const t = await getTranslations("ProductList");

  // GET /api/products?category={slug}&page=1&limit=12 — includes sub-categories.
  const { products, pagination } = await fetchProducts({
    category: category.slug,
    page: Math.max(1, Number(page) || 1),
  });

  return (
    <div className="">
      <div className="bg-gray-bread mb-12 text-start py-6">
        <div className="mx-auto lg:max-w-7xl px-4">
          <h1 className="mb-0 text-2xl font-bold text-gray-900 text-white sm:text-3xl md:text-4xl">
            {category.name}
          </h1>
        </div>
      </div>
      <div className="mx-auto lg:max-w-7xl px-4">
        <ProductCatalog
          products={products}
          categories={categories}
          pagination={pagination}
          basePath={`/products/${category.slug}`}
          activeSlug={category.slug}
          allLabel={t("allCategories")}
          emptyMessage={t("comingSoon")}
        />
      </div>
    </div>
  );
}
