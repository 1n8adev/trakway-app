import { ImageResponse } from 'next/og';

// Default 1200×630 social share image (og:image / twitter:image) for every page without its own
// image. Lives under /api so the locale middleware leaves it alone. Product pages use their photo.
export async function GET(request: Request) {
  const logo = new URL('/images/trakway-technologies.png', request.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #ffffff 0%, #fff4ec 55%, #ffd9bf 100%)',
          fontFamily: 'sans-serif'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> only */}
        <img src={logo} alt="" width={420} height={210} style={{ objectFit: 'contain', marginLeft: -12 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 72, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>GPS Vehicle Tracking</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: '#e75f00', lineHeight: 1.1 }}>Solutions</div>
          <div style={{ marginTop: 24, fontSize: 30, color: '#4b5563' }}>
            Live tracking · Anti-theft alerts · Free shipping across India
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#e75f00', fontWeight: 700 }}>www.trakwaytechnologies.com</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable' }
    }
  );
}
