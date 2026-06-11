import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OrderPage() {
  const router = useRouter();
  const { sid, email, name } = router.query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

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

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: sid || null,
          email: email || null,
          firstName: name || null,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

  const faqs = [
    {
      q: 'When will I receive my travel plan?',
      a: 'Within 24 hours of payment. Most plans land in 12–18 hours. You\'ll get an email notification as soon as it\'s ready. If we need one quick clarifying question, we\'ll reach out first so nothing is delayed.',
    },
    {
      q: 'What exactly is in the PDF?',
      a: '3 personalised destination picks (scored & ranked for your profile), a full day-by-day itinerary for your top pick, a 3-tier accommodation shortlist, curated restaurant picks, practical logistics (visa, SIM, transport, health), and a realistic per-person budget breakdown. All in one beautifully formatted, print-ready document.',
    },
    {
      q: 'What if I\'m not happy with the plan?',
      a: 'Email us within 7 days and we\'ll revise anything that doesn\'t feel right — a destination pick, the pace, the accommodation tier, whatever needs adjusting. Free of charge, no questions asked.',
    },
    {
      q: 'Is this made by AI or real people?',
      a: 'Both. We use AI to structure and process your intake answers, but every brief is reviewed and refined by a human before it reaches you. If a recommendation doesn\'t fit your profile, we catch it.',
    },
    {
      q: 'Is my payment secure?',
      a: 'Yes. Payment is processed by Stripe — the same infrastructure used by Shopify, Amazon, and Airbnb. We never see or store your card details.',
    },
  ];

  const includes = [
    { icon: '🗺', label: '3 destination picks, ranked & scored' },
    { icon: '📅', label: 'Day-by-day itinerary (your pace)' },
    { icon: '🏨', label: '3-tier accommodation shortlist' },
    { icon: '🍽', label: 'Restaurant picks & hidden gems' },
    { icon: '📋', label: 'Visa, SIM, transport & practical info' },
    { icon: '💸', label: 'Realistic budget breakdown per person' },
    { icon: '📄', label: 'Beautifully formatted print-ready PDF' },
    { icon: '✏️', label: 'Free revision within 7 days' },
  ];

  return (
    <>
      <Head>
        <title>Detour · Get Your Personalised Trip Brief — $17 Launch Offer</title>
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
          <a href="/" className="nav-logo">
            <img src="/detour.svg" alt="Detour" className="nav-logo-img" />
          </a>
          <div className="order-nav-trust">
            <span className="order-lock-icon">🔒</span>
            <span>Secure checkout via Stripe</span>
          </div>
        </div>
      </nav>

      <div className="order-wrap">

        {/* ── MAIN CONTENT: 2-col layout ── */}
        <section className="order-main-section">
          <div className="container">
            <div className="order-layout">

              {/* LEFT: What you get */}
              <div className="order-left">
                <div className="order-section-label reveal">One last step</div>
                <h2 className="order-section-title reveal">
                  {name ? <>Almost there, <em>{name}.</em></> : <>Your plan is almost<br /><em>ready to build.</em></>}
                </h2>

                <div className="order-pdf-preview reveal">
                  <div className="order-pdf-label">What&apos;s inside your PDF</div>
                  {[
                    { icon: '✈️', title: 'Cover & Trip Summary', sub: 'Dates, group, destination overview' },
                    { icon: '🗺', title: 'Destination Picks', sub: '3 options, scored & explained' },
                    { icon: '📅', title: 'Day-by-Day Itinerary', sub: 'Full schedule, your pace' },
                    { icon: '🏨', title: 'Where to Stay', sub: '3 tiers with neighbourhood notes' },
                    { icon: '📋', title: 'Practical Logistics', sub: 'Visa, SIM, transport, budget' },
                    { icon: '🍽', title: 'Restaurants & Gems', sub: 'Curated picks, no tourist traps' },
                  ].map((item) => (
                    <div className="mini-page" key={item.title}>
                      <div className="mini-page-icon">{item.icon}</div>
                      <div>
                        <div className="mini-page-title">{item.title}</div>
                        <div className="mini-page-sub">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Testimonials */}
                <div className="order-testi-block reveal">
                  <div className="order-section-label" style={{ marginBottom: '20px' }}>What travellers say</div>
                  <div className="order-testi">
                    <div className="order-testi-stars">★★★★★</div>
                    <p className="order-testi-text">&quot;The restaurant picks alone were worth it. Every single place was exactly our vibe. No tourist traps, not a bad meal all week.&quot;</p>
                    <div className="order-testi-author">
                      <img src="/priya.avif" alt="Priya" className="order-testi-avatar" width={32} height={32} />
                      <span>Priya · Couple trip · Tbilisi</span>
                    </div>
                  </div>
                  <div className="order-testi">
                    <div className="order-testi-stars">★★★★★</div>
                    <p className="order-testi-text">&quot;I&apos;d been going in circles on our Japan trip for weeks. The brief landed in my inbox and it was genuinely better than anything I&apos;d spent hours piecing together. Booked within 48 hours.&quot;</p>
                    <div className="order-testi-author">
                      <img src="/sarah.avif" alt="Sarah" className="order-testi-avatar" width={32} height={32} />
                      <span>Sarah · Solo trip · Tokyo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Price card (sticky) */}
              <div className="order-right">
                <div className="order-price-card">
                  <div className="order-price-card-top">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#3d6b4f', color: 'white', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>
                      Launch offer
                    </div>
                    <div className="order-price-amount" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span style={{ fontSize: '18px', color: 'var(--ink-muted)', textDecoration: 'line-through', fontWeight: 400 }}>$97</span>
                      <span className="order-price-currency">$</span>
                      <span className="order-price-num">17</span>
                    </div>
                    <div className="order-price-desc">One time payment · Delivered in 24h</div>
                  </div>

                  <div className="order-price-includes-mini">
                    {includes.slice(1, 6).map((item) => (
                      <div key={item.label} className="order-price-include-row">
                        <span className="order-check">✓</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                    <div className="order-price-include-row">
                      <span className="order-check">✓</span>
                      <span>{includes[6].label}</span>
                    </div>
                  </div>

                  <button
                    className="order-cta-btn"
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="order-btn-loading">
                        <span className="order-spinner" />
                        Redirecting to checkout…
                      </span>
                    ) : (
                      'Get my trip plan for $17 →'
                    )}
                  </button>

                  {error && <div className="order-error">{error}</div>}

                  <div className="order-security-row">
                    <span>🔒</span>
                    <span>Secure payment via Stripe. We never store your card.</span>
                  </div>

                  <div className="order-guarantee-mini">
                    <div className="order-guarantee-icon">🛡</div>
                    <div>
                      <strong>7-day revision guarantee</strong>
                      <p>Not happy with anything? Email us within 7 days and we&apos;ll fix it — free.</p>
                    </div>
                  </div>

                  <div className="order-delivery-badge">
                    <span>📬</span>
                    <span>Delivered to your inbox within <strong>24 hours</strong></span>
                  </div>
                </div>

                {/* Cost comparison block */}
                <div className="order-comparison reveal">
                  <div className="order-comparison-title">What bad planning actually costs</div>
                  <div className="order-comparison-rows">
                    <div className="order-comparison-row order-comparison-row--bad">
                      <span className="order-comparison-label"><span className="order-comparison-x">✗</span>16h of your time @ $30/hr</span>
                      <span className="order-comparison-val crossed">$480</span>
                    </div>
                    <div className="order-comparison-row order-comparison-row--bad">
                      <span className="order-comparison-label"><span className="order-comparison-x">✗</span>Suboptimal hotel booked in a rush</span>
                      <span className="order-comparison-val crossed">$200+</span>
                    </div>
                    <div className="order-comparison-row order-comparison-row--bad">
                      <span className="order-comparison-label"><span className="order-comparison-x">✗</span>Tourist trap restaurants</span>
                      <span className="order-comparison-val crossed">$80+</span>
                    </div>
                    <div className="order-comparison-row order-comparison-subtotal">
                      <span>Avoidable waste</span>
                      <span className="order-comparison-val crossed">$760+</span>
                    </div>
                    <div className="order-comparison-row order-comparison-total">
                      <span className="order-comparison-label"><span className="order-comparison-check">✓</span>Detour trip brief</span>
                      <span className="order-comparison-val accent">$17</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── GUARANTEE ── */}
        <section className="order-guarantee-section">
          <div className="container">
            <div className="order-guarantee-full reveal">
              <div className="order-guarantee-full-icon">🛡</div>
              <div className="order-guarantee-full-text">
                <h3>7-day revision guarantee</h3>
                <p>
                  If anything in your brief doesn&apos;t feel right — a destination pick, the pace, the accommodation suggestions — email us within 7 days of receiving your plan and we&apos;ll revise it at no extra charge. We&apos;re not happy until you&apos;re happy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="order-how-section">
          <div className="container">
            <div className="order-section-label reveal" style={{ textAlign: 'center' }}>What happens next</div>
            <h2 className="order-section-title reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
              Three steps to <em>ready.</em>
            </h2>
            <div className="order-steps">
              <div className="order-step reveal">
                <div className="order-step-done">✓</div>
                <div className="order-step-content">
                  <h3>Form completed</h3>
                  <p>Done. We have everything we need to build your plan.</p>
                </div>
              </div>
              <div className="order-step-arrow">→</div>
              <div className="order-step reveal">
                <div className="order-step-num">2</div>
                <div className="order-step-content">
                  <h3>Complete checkout</h3>
                  <p>Secure payment via Stripe. Takes 30 seconds.</p>
                </div>
              </div>
              <div className="order-step-arrow">→</div>
              <div className="order-step reveal">
                <div className="order-step-num">3</div>
                <div className="order-step-content">
                  <h3>Receive your brief</h3>
                  <p>Your personalised PDF lands in your inbox within 24 hours.</p>
                </div>
              </div>
            </div>

            <div className="order-final-cta-wrap">
              <button
                className="order-cta-btn order-cta-btn--center"
                onClick={handleCheckout}
                disabled={loading}
              >
                    {loading ? 'Redirecting…' : 'Get my trip plan for $17 →'}
              </button>
              <p className="order-final-trust">Delivered within 24 hours · Free revision within 7 days</p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="order-faq-section">
          <div className="container" style={{ maxWidth: '720px' }}>
            <div className="order-section-label reveal" style={{ textAlign: 'center' }}>Questions</div>
            <h2 className="order-section-title reveal" style={{ textAlign: 'center', marginBottom: '40px' }}>
              Still wondering? <em>We&apos;ve got you.</em>
            </h2>
            <div className="faq-list reveal">
              {faqs.map((faq, i) => (
                <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                  <div className="faq-q" onClick={() => toggleFaq(i)}>{faq.q}</div>
                  <div className="faq-a">{faq.a}</div>
                </div>
              ))}
            </div>
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
