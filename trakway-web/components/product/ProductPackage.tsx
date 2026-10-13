import type { ProductPackageRow } from '@/lib/products';

export default function ProductPackage({
  featureLabel,
  detailsLabel,
  rows
}: {
  featureLabel: string;
  detailsLabel: string;
  rows: ProductPackageRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-base">
        <thead>
          <tr className="bg-brand-100 text-left text-gray-900">
            <th className="w-1/3 px-6 py-3 text-lg font-bold">{featureLabel}</th>
            <th className="px-6 py-3 text-lg font-bold">{detailsLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-gray-200">
              <td className="w-1/3 whitespace-pre-line bg-brand-50 px-6 py-4 align-top font-semibold text-brand-700">
                {row.label}
              </td>
              <td className="whitespace-pre-line px-6 py-4 align-top leading-relaxed text-gray-700">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
