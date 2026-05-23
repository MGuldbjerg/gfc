import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Guldbjergs Fantasy Challenge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a2540',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: '#faf8f5',
        }}
      >
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: 56,
            background: '#0a2540',
            border: '8px solid #e8b923',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 56,
          }}
        >
          <div style={{ fontSize: 220, fontWeight: 800, color: '#e8b923', lineHeight: 1, letterSpacing: -8, marginTop: -20 }}>
            G
          </div>
        </div>
        <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: -1.5, textAlign: 'center' }}>
          Guldbjergs Fantasy Challenge
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color: '#e8b923', marginTop: 24 }}>
          — Danmarks fantasy football
        </div>
      </div>
    ),
    { ...size }
  )
}
