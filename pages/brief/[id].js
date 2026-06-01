import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

// Server-side fetch using service role key
export async function getServerSideProps({ params }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('submissions')
    .select('first_name, brief_data, brief_generation_status, departure_date, return_date, group_type, budget_per_person')
    .eq('id', params.id)
    .single();

  if (error || !data) return { notFound: true };

  return {
    props: {
      submissionId: params.id,
      firstName: data.first_name || null,
      brief: data.brief_data || null,
      generationStatus: data.brief_generation_status || null,
      departure: data.departure_date || null,
      returnDate: data.return_date || null,
      groupType: data.group_type || null,
      budget: data.budget_per_person || null,
    },
  };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function formatDateRange(departure, returnDate) {
  if (!departure || !returnDate) return '';
  const opts = { month: 'short', day: 'numeric' };
  const d1 = new Date(departure).toLocaleDateString('en-US', opts);
  const d2 = new Date(returnDate).toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${d1} – ${d2}`;
}

function nightsCount(departure, returnDate) {
  if (!departure || !returnDate) return 0;
  return Math.round((new Date(returnDate) - new Date(departure)) / (1000 * 60 * 60 * 24));
}

function groupLabel(groupType) {
  const map = {
    solo: 'Solo', couple: 'Couple',
    'family-young': 'Family', 'family-teens': 'Family',
    friends: 'Group', work: 'Work trip',
  };
  return map[groupType] || groupType || '—';
}

function tierLabel(tier) {
  return { top_pick: '✦ Top pick', best_value: 'Best value', splurge: 'Splurge' }[tier] || tier;
}

function activityIcon(type) {
  return { meal: '🍽', transport: '🚌', accommodation: '🏨', activity: '◎' }[type] || '◎';
}

function ScoreBar({ label, value }) {
  const barRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        {label}
      </div>
      <div style={{ width: 80, height: 4, background: 'var(--sand)', borderRadius: 4, overflow: 'hidden' }}>
        <div
          ref={barRef}
          style={{
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 4,
            width: `${width}%`,
            transition: 'width 0.8s ease',
          }}
        />
      </div>
    </div>
  );
}

// ── SECTION COMPONENTS ────────────────────────────────────────────────────────

function DestCard({ dest, isTop }) {
  const rankLabels = { 1: 'Top pick', 2: 'Alt. pick', 3: 'Wildcard' };
  return (
    <div style={{
      border: `1px solid ${isTop ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      boxShadow: isTop ? '0 2px 20px rgba(200,135,74,0.12)' : 'none',
    }}>
      <div style={{
        width: 64, background: isTop ? 'var(--accent)' : 'var(--sand)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, gap: 4,
      }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 300, color: isTop ? 'white' : 'var(--ink-muted)', lineHeight: 1 }}>
          {dest.rank}
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: isTop ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)' }}>
          {rankLabels[dest.rank]}
        </div>
      </div>
      <div style={{ padding: '20px 24px', flex: 1 }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 400, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          {dest.name}
          <span style={{ fontSize: 12, color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>{dest.country}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
          {(dest.tags || []).map((tag) => (
            <span key={tag} style={{
              fontSize: 11, padding: '3px 10px',
              background: isTop ? 'var(--accent-light)' : 'var(--cream)',
              border: `1px solid ${isTop ? 'rgba(200,135,74,0.2)' : 'var(--border)'}`,
              borderRadius: 999,
              color: isTop ? 'var(--accent)' : 'var(--ink-soft)',
            }}>{tag}</span>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.65, marginTop: 10, marginBottom: 12 }}>
          {dest.why}
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <ScoreBar label="Safety" value={dest.scores?.safety || 0} />
          <ScoreBar label="Value" value={dest.scores?.value || 0} />
          <ScoreBar label="Match" value={dest.scores?.match || 0} />
        </div>
      </div>
    </div>
  );
}

function ItineraryDay({ day }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: open ? 14 : 0,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left',
        }}
      >
        <div style={{
          width: 40, height: 40, background: 'var(--ink)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 400, color: 'white' }}>
            {day.day}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 400 }}>{day.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{day.date}{day.base ? ` · ${day.base}` : ''}</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', marginRight: 4 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 54 }}>
          {(day.activities || []).map((act, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, minWidth: 64, letterSpacing: '0.04em', marginTop: 2 }}>
                {act.time}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                <span style={{ marginRight: 6 }}>{activityIcon(act.type)}</span>
                <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{act.title}</strong>
                {act.description ? ` — ${act.description}` : ''}
                {act.tip && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--accent)', fontStyle: 'italic' }}>
                    Tip: {act.tip}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon, title, body }) {
  return (
    <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 20, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{body}</div>
    </div>
  );
}

function AccomCard({ option }) {
  const isTop = option.tier === 'top_pick';
  return (
    <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: isTop ? 'var(--accent)' : 'var(--ink-soft)', marginBottom: 8 }}>
        {tierLabel(option.tier)}
      </div>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, marginBottom: 4 }}>{option.name}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 10 }}>{option.neighbourhood}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 10 }}>{option.why}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{option.price_per_night_usd}/night</strong>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{option.booking_guidance}</span>
      </div>
    </div>
  );
}

// ── TAB SECTIONS ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'destinations', label: 'Destinations' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'practical', label: 'Practical' },
  { id: 'stay', label: 'Where to Stay' },
];

// ── PAGE ──────────────────────────────────────────────────────────────────────

export default function BriefPage({ submissionId, firstName, brief, generationStatus, departure, returnDate, groupType, budget }) {
  const [activeTab, setActiveTab] = useState('destinations');
  const sectionRefs = useRef({});

  const scrollTo = (id) => {
    setActiveTab(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Auto-refresh while generating
  useEffect(() => {
    if (!brief && generationStatus !== 'failed') {
      const t = setTimeout(() => window.location.reload(), 8000);
      return () => clearTimeout(t);
    }
  }, [brief, generationStatus]);

  // Observe sections for active tab highlight on scroll
  useEffect(() => {
    if (!brief) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveTab(entry.target.id);
        });
      },
      { threshold: 0.3 }
    );
    TABS.forEach(({ id }) => {
      if (sectionRefs.current[id]) observer.observe(sectionRefs.current[id]);
    });
    return () => observer.disconnect();
  }, [brief]);

  const nights = nightsCount(departure, returnDate);
  const dest = brief?.destinations?.[0];
  const title = dest ? `${firstName}'s ${dest.name} Brief` : `Your Trip Brief`;

  return (
    <>
      <Head>
        <title>{title} · Detour</title>
        <meta name="robots" content="noindex" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --cream: #f8f4ee;
          --ink: #1a1814;
          --ink-soft: #4a4640;
          --ink-muted: #9a9490;
          --accent: #c8874a;
          --accent-light: #f5e8d8;
          --green: #3d6b4f;
          --green-light: #e8f2ec;
          --border: #e0d8cc;
          --sand: #ede8e0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; color: var(--ink); background: var(--cream); }
        @media print {
          .no-print { display: none !important; }
          .tab-bar { display: none !important; }
          section { page-break-inside: avoid; }
        }
      ` }} />

      {/* ── COVER ── */}
      <div style={{ background: 'var(--ink)', color: 'white', padding: '32px 48px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 500, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, background: 'var(--accent)', borderRadius: '50%' }} />
          Detour
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          Personalised Trip Brief · Confidential
        </div>
      </div>

      <div style={{ background: 'var(--cream)', padding: '56px 48px 40px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
          Prepared exclusively for {firstName}
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
          {brief ? (
            <>Your trip<br />to <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{brief.destination_chosen || dest?.name}</em></>
          ) : (
            'Your trip brief'
          )}
        </h1>
        {brief && (
          <p style={{ fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.7, maxWidth: 480, fontWeight: 300, marginBottom: 36 }}>
            A fully personalised travel brief crafted around your style, budget, and preferences.
          </p>
        )}

        {/* Meta strip */}
        {(departure || groupType) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', maxWidth: 560, marginBottom: 40 }}>
            {[
              { label: 'Travel dates', value: formatDateRange(departure, returnDate) },
              { label: 'Duration', value: nights ? `${nights} nights` : '—' },
              { label: 'Travellers', value: groupLabel(groupType) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'white', padding: '18px 22px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 400 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Print + status */}
        {brief && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }} className="no-print">
            <button
              onClick={() => window.print()}
              style={{ fontSize: 13, padding: '8px 18px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Print / Save PDF
            </button>
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Or save as PDF from your browser's print dialog</span>
          </div>
        )}
      </div>

      {/* ── LOADING / FAILED STATES ── */}
      {!brief && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          {generationStatus === 'failed' ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 300, marginBottom: 12 }}>
                Something went wrong
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                We hit a snag generating your brief. Our team has been alerted and will fix this shortly.
                If you don't hear from us within 2 hours, email{' '}
                <a href="mailto:hello@trydetour.com" style={{ color: 'var(--accent)' }}>hello@trydetour.com</a>.
              </p>
            </>
          ) : (
            <>
              <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 300, marginBottom: 12 }}>
                Your brief is being prepared
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                We're building your personalised trip plan right now. This page will update automatically — usually within 2–3 minutes.
              </p>
            </>
          )}
              <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        </div>
      )}

      {/* ── BRIEF CONTENT ── */}
      {brief && (
        <>
          {/* Sticky tab bar */}
          <div className="tab-bar no-print" style={{
            position: 'sticky', top: 0, zIndex: 100,
            background: 'white', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 0, overflowX: 'auto',
          }}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  padding: '14px 24px', fontSize: 13, fontFamily: 'inherit',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `2px solid ${activeTab === id ? 'var(--accent)' : 'transparent'}`,
                  color: activeTab === id ? 'var(--accent)' : 'var(--ink-soft)',
                  fontWeight: activeTab === id ? 500 : 400,
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px 80px' }}>

            {/* ── DESTINATIONS ── */}
            <section id="destinations" ref={(el) => (sectionRefs.current.destinations = el)} style={{ paddingTop: 56 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Section 01</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Your top destination picks</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 36, maxWidth: 560 }}>
                Based on your travel style, budget, and preferences — ranked by how well they match your profile.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
                {(brief.destinations || []).map((dest) => (
                  <DestCard key={dest.rank} dest={dest} isTop={dest.rank === 1} />
                ))}
              </div>
              <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(200,135,74,0.25)', borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0', padding: '16px 20px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6, fontWeight: 500 }}>✦ Our recommendation</div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
                  The full itinerary below is built around <strong>{brief.destinations?.[0]?.name}</strong>.
                  If you'd prefer a different pick, reply to your delivery email and we'll rebuild it within 24 hours at no charge.
                </p>
              </div>
            </section>

            {/* ── ITINERARY ── */}
            <section id="itinerary" ref={(el) => (sectionRefs.current.itinerary = el)} style={{ paddingTop: 64 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Section 02</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Your day-by-day itinerary</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 36, maxWidth: 560 }}>
                {brief.trip_duration_nights} nights in {brief.destination_chosen}. Timings are suggestions — adjust freely.
              </p>
              {(brief.itinerary || []).map((day) => (
                <ItineraryDay key={day.day} day={day} />
              ))}
              {brief.local_tip && (
                <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(200,135,74,0.25)', borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0', padding: '16px 20px', marginTop: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6, fontWeight: 500 }}>✦ Local tip</div>
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.65 }}>{brief.local_tip}</p>
                </div>
              )}
            </section>

            {/* ── PRACTICAL ── */}
            <section id="practical" ref={(el) => (sectionRefs.current.practical = el)} style={{ paddingTop: 64 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Section 03</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Everything practical</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
                The logistics sorted so you don't have to think about them.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
                {[
                  { icon: '🛂', title: 'Visa & Entry', body: brief.practical?.visa },
                  { icon: '💉', title: 'Health & Vaccinations', body: brief.practical?.health_vaccinations },
                  { icon: '📱', title: 'Connectivity', body: brief.practical?.sim_connectivity },
                  { icon: '🚌', title: 'Getting Around', body: brief.practical?.getting_around },
                  { icon: '💸', title: 'Money', body: brief.practical?.money_currency },
                  { icon: '🌤', title: 'Weather', body: brief.practical?.weather_in_travel_month },
                ].filter(b => b.body).map((block) => (
                  <InfoBlock key={block.title} {...block} />
                ))}
              </div>

              {brief.practical?.packing_tips && (
                <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(200,135,74,0.25)', borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0', padding: '16px 20px', marginBottom: 40 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6, fontWeight: 500 }}>🎒 What to pack</div>
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.65 }}>{brief.practical.packing_tips}</p>
                </div>
              )}

              {/* Budget breakdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 24px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>Budget Breakdown</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead>
                  <tr>
                    {['Category', 'Notes', 'Est. per person'].map((h) => (
                      <th key={h} style={{ textAlign: h === 'Est. per person' ? 'right' : 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', padding: '8px 12px', background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(brief.budget_breakdown || []).map((line, i) => (
                    <tr key={i} style={line.is_total ? { background: 'var(--cream)' } : {}}>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: line.is_total ? 'var(--ink)' : 'var(--ink-soft)', borderBottom: line.is_total ? 'none' : '1px solid var(--border)', fontWeight: line.is_total ? 500 : 400 }}>{line.category}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: 'var(--ink-soft)', borderBottom: line.is_total ? 'none' : '1px solid var(--border)' }}>{line.notes}</td>
                      <td style={{ padding: '11px 12px', fontSize: line.is_total ? 16 : 13, textAlign: 'right', fontFamily: line.is_total ? 'Cormorant Garamond, serif' : 'inherit', color: 'var(--ink)', borderBottom: line.is_total ? 'none' : '1px solid var(--border)', fontWeight: line.is_total ? 500 : 400 }}>{line.estimated_cost_usd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ── WHERE TO STAY ── */}
            <section id="stay" ref={(el) => (sectionRefs.current.stay = el)} style={{ paddingTop: 64 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Section 04</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Where to stay</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
                Three handpicked options at different price points, all chosen for their location and match with your travel style.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
                {(brief.accommodation || []).map((opt) => (
                  <AccomCard key={opt.tier} option={opt} />
                ))}
              </div>

              {/* Restaurants */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 24px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>Restaurants</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 40 }}>
                {(brief.restaurants || []).map((r, i) => (
                  <div key={i} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{r.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{r.price_level}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 6, letterSpacing: '0.04em' }}>{r.cuisine}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{r.why}</div>
                    {r.dietary_note && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>✓ {r.dietary_note}</div>}
                    {r.best_for && <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4, fontStyle: 'italic' }}>{r.best_for}</div>}
                  </div>
                ))}
              </div>

              {/* Hidden gems */}
              {(brief.hidden_gems || []).length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 20px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>Hidden Gems</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                  <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 40 }}>
                    {brief.hidden_gems.map((gem, i) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.65, padding: '6px 0', borderBottom: i < brief.hidden_gems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ color: 'var(--accent)', marginRight: 8 }}>✦</span>{gem}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Upsell */}
              <div style={{ background: 'var(--ink)', borderRadius: 14, padding: '32px 36px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                <div>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 300, marginBottom: 8, lineHeight: 1.2 }}>
                    Want us to handle <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>everything</em>?
                  </h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 360 }}>
                    Upgrade to our White-Glove Concierge service — we'll make restaurant reservations, create an offline-ready maps export, and be on WhatsApp during your trip.
                  </p>
                </div>
                <a
                  href="https://trydetour.com/concierge"
                  style={{ background: 'var(--accent)', color: 'white', padding: '14px 28px', borderRadius: 8, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0 }}
                >
                  Upgrade · $397 →
                </a>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--ink-muted)' }}>
            <span>trydetour.com · hello@trydetour.com · Questions? Reply to your delivery email.</span>
            <button onClick={() => window.print()} className="no-print" style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Print / Save PDF →
            </button>
          </div>
        </>
      )}
    </>
  );
}
