import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/config';

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: 'linear-gradient(135deg, #1a2a18 0%, #2d5c23 55%, #3e7b31 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: '#3e7b31',
            }}
          >
            МБ
          </div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: '#ffffff' }}>
            {siteConfig.name}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          Вспашка, целина і покос по всій Україні
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 28,
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          Виїзд сьогодні · Оплата після виконання роботи
        </div>
      </div>
    ),
    { ...size },
  );
}
