import Head from 'next/head';

export default function UnsubscribedPage() {
  return (
    <>
      <Head>
        <title>Detour · Unsubscribed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#f5f0e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          padding: '48px 40px',
          border: '1px solid #ddd8ce',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#f5e8d8',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '20px',
          }}>
            ✓
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px',
            fontWeight: 400,
            color: '#1a1814',
            margin: '0 0 12px',
          }}>
            You&rsquo;ve been unsubscribed.
          </h1>

          <p style={{
            fontSize: '15px',
            color: '#4a4640',
            lineHeight: '1.7',
            margin: '0 0 32px',
          }}>
            We&rsquo;ve removed you from this email sequence. You won&rsquo;t hear from us again about this trip.
          </p>

          <p style={{ fontSize: '14px', color: '#9a9490', margin: 0 }}>
            If you change your mind, you can always{' '}
            <a href="https://trydetour.com/form" style={{ color: '#c8874a', textDecoration: 'underline' }}>
              start a new brief
            </a>
            .
          </p>

          <div style={{
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: '1px solid #ddd8ce',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#9a9490',
          }}>
            <span style={{
              display: 'inline-block',
              width: '5px',
              height: '5px',
              background: '#c8874a',
              borderRadius: '50%',
            }} />
            Detour
          </div>
        </div>
      </div>
    </>
  );
}
