import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';

export default function ThankYou() {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const nextSteps = [
    {
      icon: '📬',
      title: 'Check your inbox',
      desc: 'Your trip brief will arrive within 24 hours. Add hello@trydetour.com to your contacts so it doesn\'t land in spam.',
    },
    {
      icon: '☕',
      title: 'Sit back',
      desc: 'Seriously, you\'re done. We\'ve got everything we need. Go do something you enjoy — your plan is being built.',
    },
    {
      icon: '✈️',
      title: 'Read, book, go',
      desc: 'When your PDF lands, everything is clickable and ready to action. The hard part is done.',
    },
  ];

  return (
    <>
      <Head>
        <title>Detour · You&apos;re all set</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* NAV */}
      <nav style={{ position: 'relative', padding: '20px 0', borderBottom: '1px solid var(--border)', background: 'var(--warm-white)' }}>
        <div className="container nav-bar">
          <Link href="/" className="nav-logo">
            <img src="/detour.svg" alt="Detour" className="nav-logo-img" />
          </Link>
          <div className="order-nav-trust">
            <span>Payment confirmed</span>
            <span className="ty-check-badge">✓</span>
          </div>
        </div>
      </nav>

      <div className="ty-wrap">

        {/* ── HERO ── */}
        <section className="ty-hero">
          <div className="ty-hero-glow" />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div className="ty-icon-wrap">
              <div className="ty-icon">✦</div>
            </div>
            <h1 className="ty-h1">You&apos;re all set,<br /><em>traveller.</em></h1>
            <p className="ty-sub">
              Your payment is confirmed. We&apos;re already working on your plan.
            </p>
            <div className="ty-delivery-pill">
              <span>📬</span>
              <span>Your trip brief will be in your inbox <strong>within 24 hours</strong></span>
            </div>
          </div>
        </section>

        {/* ── WHAT HAPPENS NEXT ── */}
        <section className="ty-next-section">
          <div className="container">
            <div className="order-section-label reveal" style={{ textAlign: 'center' }}>What happens now</div>
            <h2 className="order-section-title reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
              Sit back. <em>We&apos;ve got this.</em>
            </h2>

            <div className="ty-steps">
              {nextSteps.map((step, i) => (
                <div key={i} className="ty-step reveal">
                  <div className="ty-step-icon">{step.icon}</div>
                  <h3 className="ty-step-title">{step.title}</h3>
                  <p className="ty-step-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REASSURANCE ── */}
        <section className="ty-reassurance-section">
          <div className="container" style={{ maxWidth: '720px' }}>

            <div className="ty-reassurance-card reveal">
              <div className="ty-reassurance-icon">📋</div>
              <div>
                <h3>What&apos;s in your brief</h3>
                <ul className="ty-reassurance-list">
                  <li>3 personalised destination picks, ranked & scored for your profile</li>
                  <li>Full day-by-day itinerary for your top pick, at your pace</li>
                  <li>Accommodation shortlist across 3 price tiers</li>
                  <li>Restaurant picks & hidden gems (filtered for your dietary needs)</li>
                  <li>Practical info: visa, SIM, transport, health, what to pack</li>
                  <li>Realistic per-person budget breakdown</li>
                  <li>Beautifully formatted, print-ready PDF</li>
                </ul>
              </div>
            </div>

            <div className="ty-guarantee-card reveal">
              <div className="ty-guarantee-icon">🛡</div>
              <div>
                <h3>You&apos;re covered</h3>
                <p>
                  If anything in your brief doesn&apos;t feel right — a destination pick, the pace, the accommodation options — email us within <strong>7 days</strong> of receiving your plan and we&apos;ll revise it. Free of charge. No questions asked.
                </p>
                <a href="mailto:hello@trydetour.com" className="ty-contact-link">hello@trydetour.com</a>
              </div>
            </div>

            <div className="ty-spam-note reveal">
              <span className="ty-spam-icon">💡</span>
              <p>
                <strong>Quick tip:</strong> Add <strong>hello@trydetour.com</strong> to your contacts now so your brief doesn&apos;t land in spam. It happens occasionally with a new sender.
              </p>
            </div>

          </div>
        </section>

        {/* ── QUOTE / EMOTIONAL CLOSE ── */}
        <section className="ty-close-section">
          <div className="container" style={{ maxWidth: '680px', textAlign: 'center' }}>
            <div className="ty-close-quote reveal">
              <blockquote>
                &quot;The trip starts the moment you stop planning and start looking forward.&quot;
              </blockquote>
            </div>
            <p className="ty-close-sub reveal">
              You&apos;ve done the hard part. We&apos;ll handle the rest.
            </p>
          </div>
        </section>

      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">
          <img src="/detour.svg" alt="Detour" className="footer-logo-img" />
        </div>
        <p>trydetour.com · Made for travellers who have better things to do than plan.</p>
      </footer>
    </>
  );
}
