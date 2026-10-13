export default function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className ?? ''}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-brand-500"
        >
          <path d="M12 2.5l2.9 6.4 7 .7-5.3 4.7 1.6 6.9-6.2-3.6-6.2 3.6 1.6-6.9-5.3-4.7 7-.7Z" />
        </svg>
      ))}
    </div>
  );
}
