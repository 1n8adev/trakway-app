import { getTranslations } from "next-intl/server";
import { fetchCategories, fetchProducts } from "@/lib/api";
import ProductCatalog from "@/components/products/ProductCatalog";

export default async function ProductListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const t = await getTranslations("ProductList");

  // "All" tab → GET /api/products?page=1&limit=12 (no category filter)
  const [categories, { products, pagination }] = await Promise.all([
    fetchCategories(),
    fetchProducts({ page: Math.max(1, Number(page) || 1) }),
  ]);

  return (
    <div className="">
      <div className="bg-gray-bread mb-12 text-start py-6">
        <div className="mx-auto lg:max-w-7xl px-4">
          <h1 className="mb-0 text-2xl font-bold text-gray-900 text-white sm:text-3xl md:text-4xl">
            {t("heading")}
          </h1>
        </div>
      </div>
      <div className="mx-auto lg:max-w-7xl px-4">
        <ProductCatalog
          products={products}
          categories={categories}
          pagination={pagination}
          basePath="/products"
          allLabel={t("allCategories")}
          emptyMessage={t("comingSoon")}
        />
      </div>
    </div>
  );
}
