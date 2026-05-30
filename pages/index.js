import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'What if I already know where I want to go?',
      a: "Perfect. Just tell us in the form. We'll skip the destination recommendations and focus entirely on building out the best possible itinerary, accommodation shortlist, restaurants, and practical info for your chosen destination.",
    },
    {
      q: 'How is this different from using ChatGPT?',
      a: "ChatGPT gives you generic suggestions unless you spend 30+ minutes prompting it carefully, and even then it lacks current, ground-level knowledge of what's actually good right now. Our briefs are built using your specific form answers, cross-referenced with up-to-date destination data, and formatted into a clean, actionable document you can actually use. It's the difference between a chatbot and a travel researcher who's actually done the work.",
    },
    {
      q: 'How long does it take to receive my brief?',
      a: "Within 24 hours of submitting your form and completing checkout. For most orders, it's faster, typically 12–18 hours. If we need clarification on anything, we'll email you quickly so nothing is delayed.",
    },
    {
      q: 'What format is the brief delivered in?',
      a: "A beautifully designed, print-ready PDF delivered to your inbox as an email attachment. It's easy to share with travel companions, save to your phone, or print for the trip.",
    },
    {
      q: 'Can I request changes after receiving my brief?',
      a: "Yes. If you're not happy with anything, whether a destination pick doesn't feel right, the pace is off, or you want different accommodation options, email us within 7 days and we'll revise it at no charge.",
    },
    {
      q: 'Is this made by AI or a real person?',
      a: "Both, honestly. We use AI to process and structure your intake data, but every brief is reviewed and refined by a human to ensure the recommendations are actually good, not just plausible-sounding. If something seems off for your profile, we catch it.",
    },
  ];

  return (
    <>
      <Head>
        <title>Detour · Your Personalised Trip Brief — $37</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* NAV */}
      <nav id="mainNav" className={scrolled ? 'scrolled' : ''}>
        <div className="container nav-bar">
          <a href="#" className="nav-logo">
            <img src="/detour.svg" alt="Detour" className="nav-logo-img" />
          </a>
          <Link href="#get-started" className="nav-cta">Plan my trip</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow">Done-For-You</div>
          <h1>Your next trip, <em>fully planned.</em><br />In 24 hours.</h1>
          <p className="hero-sub">
            Tell us about your dream trip. We&apos;ll send back a complete, personalised travel plan: destination picks, day-by-day itinerary, where to stay, and everything practical.
          </p>
          <div className="hero-cta-row">
            <Link href="#get-started" className="btn-primary">
              Plan my trip
            </Link>
            <span className="hero-trust">It takes 5 minutes only</span>
          </div>
        </div>

        <div className="hero-strip">
          <div className="container">
            <div className="strip-inner">
              <div className="strip-stat">
                <div className="strip-stat-num">16h</div>
                <div className="strip-stat-label">Average time people spend<br />planning a single trip</div>
              </div>
              <div className="strip-divider"></div>
              <div className="strip-stat">
                <div className="strip-stat-num">59%</div>
                <div className="strip-stat-label">Of travellers don&apos;t know<br />where they want to go yet</div>
              </div>
              <div className="strip-divider"></div>
              <div className="strip-stat">
                <div className="strip-stat-num">24h</div>
                <div className="strip-stat-label">How long it takes us<br />to build your full plan</div>
              </div>
              <div className="strip-divider"></div>
              <div className="strip-stat">
                <div className="strip-stat-num">$37</div>
                <div className="strip-stat-label">One-time payment. <br />No hidden fees.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="problem">
        <div className="container">
          <div className="section-label reveal">The Problem</div>
          <h2 className="section-title reveal">Trip planning has become <em>an unpaid second job.</em></h2>
          <p className="section-body reveal">
            You open 14 tabs. You read 40 reviews that contradict each other. You build a spreadsheet. You ask friends who went three years ago. You scroll TikTok for &quot;hidden gems&quot; that everyone already knows. Three weeks later, you still haven&apos;t booked anything.
          </p>

          <div className="problem-grid reveal">
            <div className="problem-card">
              <span className="problem-icon">🌀</span>
              <h3>Analysis paralysis</h3>
              <p>195 countries. Thousands of hotels. Infinite itinerary blogs. The internet has too many opinions and not one of them is tailored to you.</p>
            </div>
            <div className="problem-card">
              <span className="problem-icon">⏳</span>
              <h3>It steals your time</h3>
              <p>Priceline&apos;s research found the average traveller spends 16 hours planning a single trip. That&apos;s two full work days, before the holiday even starts.</p>
            </div>
            <div className="problem-card">
              <span className="problem-icon">😓</span>
              <h3>You arrive already exhausted</h3>
              <p>Nearly 40% of Gen Z travellers say they start their trip feeling drained from the planning process itself. The anticipation becomes dread.</p>
            </div>
            <div className="problem-card">
              <span className="problem-icon">🤷</span>
              <h3>Generic advice everywhere</h3>
              <p>&quot;Top 10 things to do in Bali.&quot; Great. You&apos;ve been. The blog doesn&apos;t know you&apos;re travelling solo in June with a $2k budget and a bad knee.</p>
            </div>
          </div>

          <div className="problem-stat-bar reveal">
            <div className="pstat-num">68%</div>
            <div className="pstat-text">
              <strong>of travellers admit to checking too many sources to compare options</strong> and 77% wish they could identify the best choices for their needs more quickly. (Accenture, 2024)
            </div>
          </div>
        </div>
      </section>

      {/* AGITATE */}
      <section className="agitate">
        <div className="container">
          <div className="section-label reveal">Why it keeps happening</div>
          <h2 className="section-title reveal">The problem isn&apos;t you.<em> It&apos;s the system.</em></h2>

          <div className="agitate-quote reveal">
            <blockquote className="agitate-quote-text">
              &quot;I&apos;m a bit frustrated because this could be done more efficiently... I&apos;ve been stressing myself out so badly that the excitement I should be feeling hasn&apos;t really hit me yet.&quot;
            </blockquote>
            <cite className="agitate-quote-author">
              <img src="/fatima.avif" alt="Fatima Al-Rashid" className="agitate-quote-avatar" width={44} height={44} />
              <span className="agitate-quote-byline">
                <span className="agitate-quote-name">Fatima Al-Rashid</span>
                <span className="agitate-quote-meta">29yo · Dubai, UAE</span>
              </span>
            </cite>
          </div>

          <p className="section-body reveal">
            <strong>The travel industry is built to overwhelm you.</strong> More options means more clicks. More clicks means more ad revenue. Nobody profits when you decide quickly and confidently. That&apos;s by design.<br /><br />
            Meanwhile, the &quot;free&quot; alternatives like AI chatbots, Reddit threads or travel blogs give you generic answers that aren&apos;t built around your dates, your budget, your group, your pace, your dietary needs, your past trips, your dream day.
          </p>

          <div className="cost-calc reveal">
            <div className="cost-calc-header">What planning a trip actually costs you</div>
            <div className="cost-rows">
              <div className="cost-row">
                <span className="label">16 hours of your time @ avg. $30/hr</span>
                <span className="val">$480</span>
              </div>
              <div className="cost-row">
                <span className="label">Suboptimal hotel booked in a rush</span>
                <span className="val">$200+</span>
              </div>
              <div className="cost-row">
                <span className="label">Restaurant disappointments (tourist traps)</span>
                <span className="val">$80+</span>
              </div>
              <div className="cost-row">
                <span className="label">Stress, decision fatigue, lost excitement</span>
                <span className="val">Priceless</span>
              </div>
              <div className="cost-row total">
                <span className="label">Total cost of &quot;free&quot; planning</span>
                <span className="val">$760+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="solution">
        <div className="container">
          <div className="section-label reveal">The Solution</div>
          <h2 className="section-title reveal">Your <em>personal travel researcher</em></h2>
          <p className="solution-intro reveal">
            Fill in a 5-minute form about your trip. Within 24 hours, you get a <strong>fully personalised, beautifully designed PDF</strong> with everything you need to travel confidently, built around you, not a generic tourist.
          </p>

          <div className="what-you-get">
            <div className="get-card reveal">
              <span className="get-card-icon">🗺</span>
              <h3>3 handpicked destination picks</h3>
              <p>Ranked and scored based on your vibe, budget, and preferences with honest reasoning for each. Not a list of the same places everyone suggests.</p>
              <span className="tag">Personalised to you</span>
            </div>
            <div className="get-card reveal">
              <span className="get-card-icon">📅</span>
              <h3>Day-by-day itinerary</h3>
              <p>A full plan for your #1 pick — mornings, afternoons, evenings — at your pace. Not jam-packed unless you want it that way.</p>
              <span className="tag">Your pace, your style</span>
            </div>
            <div className="get-card reveal">
              <span className="get-card-icon">🏨</span>
              <h3>Where to stay (3 tiers)</h3>
              <p>Budget, mid-range, and splurge options: a curated shortlist with neighbourhood context and booking guidance, ready for you to book.</p>
              <span className="tag">No paid placements</span>
            </div>
            <div className="get-card reveal">
              <span className="get-card-icon">🍽</span>
              <h3>Restaurant picks &amp; hidden gems</h3>
              <p>Places locals actually eat. Filtered for your dietary needs. Curated picks: ready for you to book, not the usual tourist list.</p>
              <span className="tag">Off the tourist trail</span>
            </div>
            <div className="get-card reveal">
              <span className="get-card-icon">📋</span>
              <h3>Practical logistics</h3>
              <p>Visa requirements, best SIM card, local transport, health notes, tipping culture, what to pack: every practical detail in one place.</p>
              <span className="tag">Nothing missed</span>
            </div>
            <div className="get-card reveal">
              <span className="get-card-icon">💸</span>
              <h3>Budget breakdown</h3>
              <p>A realistic per-person cost estimate based on your stated budget: accommodation, food, activities, transport. No nasty surprises.</p>
              <span className="tag">Reality-checked</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
        <div className="container">
          <div className="section-label reveal">How it works</div>
          <h2 className="section-title reveal">Three steps from <em>overwhelmed to ready.</em></h2>

          <div className="steps">
            <div className="step-item reveal">
              <div className="step-num">1</div>
              <div className="step-content">
                <h3>Fill in the brief form</h3>
                <p>5 minutes. Tell us your dates, who you&apos;re travelling with, your budget, your travel style, past trips you loved, and your dream day. The more specific, the better your plan.</p>
                <span className="step-time">⏱ 5 minutes</span>
              </div>
            </div>
            <div className="step-item reveal">
              <div className="step-num">2</div>
              <div className="step-content">
                <h3>We build your plan</h3>
                <p>Our team uses your intake answers to craft a fully personalised, beautifully formatted PDF: destination picks, itinerary, accommodation, restaurants, logistics, and budget.</p>
                <span className="step-time">⏱ Within 24 hours</span>
              </div>
            </div>
            <div className="step-item reveal">
              <div className="step-num">3</div>
              <div className="step-content">
                <h3>Receive your brief &amp; book</h3>
                <p>Your trip plan lands in your inbox. Read it over a coffee. Everything is clickable, clear, and ready to action. The hard work is done, you just need to book and enjoy.</p>
                <span className="step-time">⏱ In your inbox</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="proof">
        <div className="container">
          <div className="section-label reveal">Real travellers</div>
          <h2 className="section-title reveal">They stopped planning. <em>Started travelling.</em></h2>

          <div className="testimonials">
            <div className="testi reveal">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">&quot;I&apos;d been going in circles on our Japan trip for weeks. The brief landed in my inbox and it was genuinely better than anything I&apos;d spent hours piecing together. Booked within 48 hours.&quot;</div>
              <div className="testi-author">
                <img src="/sarah.avif" alt="Sarah" className="testi-avatar" width={36} height={36} />
                <div>
                  <div className="testi-name">Sarah</div>
                  <div className="testi-meta">Solo trip · Tokyo</div>
                </div>
              </div>
            </div>
            <div className="testi reveal">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">&quot;Travelling with two kids under 7 means every decision is ten times harder. The plan was perfectly calibrated for our family. I didn&apos;t have to second-guess a thing.&quot;</div>
              <div className="testi-author">
                <img src="/testimonial-01.avif" alt="Arah" className="testi-avatar" width={36} height={36} />
                <div>
                  <div className="testi-name">Arah</div>
                  <div className="testi-meta">Family trip · Portugal</div>
                </div>
              </div>
            </div>
            <div className="testi reveal">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">&quot;The restaurant picks alone were worth the $37. Every single place was exactly our vibe. No tourist traps, not a bad meal all week. The hidden viewpoint on day 3 was extraordinary.&quot;</div>
              <div className="testi-author">
                <img src="/priya.avif" alt="Priya" className="testi-avatar" width={36} height={36} />
                <div>
                  <div className="testi-name">Priya</div>
                  <div className="testi-meta">Couple · Tbilisi, Georgia</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="compare">
        <div className="container">
          <div className="section-label reveal">Why Detour</div>
          <h2 className="section-title reveal">Better than the <em>alternatives.</em></h2>

          <div className="compare-table reveal">
            <div className="ct-head">
              <div className="ct-head-cell"></div>
              <div className="ct-head-cell highlight">Detour Brief</div>
              <div className="ct-head-cell">ChatGPT</div>
              <div className="ct-head-cell">DIY Research</div>
            </div>
            <div className="ct-row">
              <div className="ct-label">Personalised to your exact dates, group &amp; budget</div>
              <div className="ct-cell highlight yes">✦ Yes</div>
              <div className="ct-cell no">Partial</div>
              <div className="ct-cell no">Maybe</div>
            </div>
            <div className="ct-row">
              <div className="ct-label">Day-by-day itinerary at your pace</div>
              <div className="ct-cell highlight yes">✦ Yes</div>
              <div className="ct-cell no">Generic</div>
              <div className="ct-cell no">If you build it</div>
            </div>
            <div className="ct-row">
              <div className="ct-label">Curated accommodation options</div>
              <div className="ct-cell highlight yes">✦ Yes</div>
              <div className="ct-cell no">Outdated</div>
              <div className="ct-cell no">Hours of work</div>
            </div>
            <div className="ct-row">
              <div className="ct-label">Dietary needs &amp; accessibility accounted for</div>
              <div className="ct-cell highlight yes">✦ Yes</div>
              <div className="ct-cell no">If prompted</div>
              <div className="ct-cell no">Easy to miss</div>
            </div>
            <div className="ct-row">
              <div className="ct-label">Budget breakdown per person</div>
              <div className="ct-cell highlight yes">✦ Yes</div>
              <div className="ct-cell no">Rough estimate</div>
              <div className="ct-cell no">Lots of guesswork</div>
            </div>
            <div className="ct-row">
              <div className="ct-label">Time required from you</div>
              <div className="ct-cell highlight" style={{ fontSize: '13px', color: 'var(--accent)' }}>5 mins</div>
              <div className="ct-cell no" style={{ fontSize: '13px' }}>1–3 hours</div>
              <div className="ct-cell no" style={{ fontSize: '13px' }}>10–20 hours</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="get-started">
        <div className="container">
          <div className="section-label">Ready? Let&apos;s go.</div>
          <h2 className="section-title">Everything you need <em>to book with confidence.</em></h2>

          <div className="price-card reveal">
            <div className="price-left">
              <div className="price-desc">Your personalised trip brief delivered to your inbox within 24 hours.</div>

              <ul className="price-includes">
                <li>3 personalised destination picks, ranked &amp; scored</li>
                <li>Full day-by-day itinerary for your top pick</li>
                <li>3-tier accommodation shortlist with neighbourhood notes &amp; booking guidance</li>
                <li>Restaurant picks &amp; off-the-beaten-path gems</li>
                <li>Practical info: visa, SIM, transport, weather, health</li>
                <li>Budget breakdown per person</li>
                <li>Beautifully formatted, print-ready PDF</li>
                <li>One round of revisions within 7 days if anything needs tweaking</li>
              </ul>

              <Link href="/form" className="btn-cta-large">
                Get my personalised plan →
              </Link>
              <p className="price-guarantee">It takes 5 minutes only</p>
            </div>

            <div className="price-right">
              <div className="price-right-title">What&apos;s inside your PDF</div>
              <div className="mini-preview">
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
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq">
        <div className="container">
          <div className="section-label reveal">Questions</div>
          <h2 className="section-title reveal">Everything you <em>might be wondering.</em></h2>

          <div className="faq-list reveal">
            {faqs.map((faq, index) => (
              <div key={index} className={`faq-item${openFaq === index ? ' open' : ''}`}>
                <div className="faq-q" onClick={() => toggleFaq(index)}>{faq.q}</div>
                <div className="faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="container">
          <div className="section-label reveal">Let&apos;s go</div>
          <h2 className="section-title reveal">Stop planning.<br /><em>Start going.</em></h2>
          <p className="section-body reveal">
            5 minutes of your time. 24 hours later, your trip is planned. For less than a restaurant meal.
          </p>
          <Link href="/form" className="btn-primary reveal" style={{ display: 'inline-flex', fontSize: '17px', padding: '20px 44px' }}>
            Get my personalised trip plan
          </Link>
          <p className="hero-trust reveal" style={{ marginTop: '16px', justifyContent: 'center' }}>
            Delivered in 24 hours
          </p>
        </div>
      </section>

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
