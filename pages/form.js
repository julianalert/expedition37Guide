import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const STEP_LABELS = ['Basics', 'Travel Style', 'Preferences', 'Final Details'];

function validateStep1({ firstName, email, departureDate, returnDate, departureCity, groupType, kidsAges, showKids }) {
  const errors = {};
  if (!firstName.trim()) errors.firstName = 'Please enter your first name';
  if (!email.trim()) errors.email = 'Please enter your email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Please enter a valid email';
  if (!departureDate) errors.departureDate = 'Please select a departure date';
  if (!returnDate) errors.returnDate = 'Please select a return date';
  else if (departureDate && returnDate < departureDate) errors.returnDate = 'Return date must be after departure';
  if (!departureCity.trim()) errors.departureCity = 'Please enter where you\'re departing from';
  if (!groupType) errors.groupType = 'Please select who\'s travelling';
  if (showKids && !kidsAges.trim()) errors.kidsAges = 'Please tell us about the children';
  return Object.keys(errors).length ? errors : null;
}

function validateStep2({ tripGoal, pace, accom }) {
  const errors = {};
  if (!tripGoal.length) errors.tripGoal = 'Please pick at least one trip goal';
  if (!pace) errors.pace = 'Please select a pace preference';
  if (!accom.length) errors.accom = 'Please pick at least one accommodation style';
  return Object.keys(errors).length ? errors : null;
}

function validateStep3({ dietary, mobility, important, destChoice, destText, showDest }) {
  const errors = {};
  if (!dietary.length) errors.dietary = 'Please pick at least one dietary option';
  if (!mobility) errors.mobility = 'Please select mobility or accessibility needs';
  if (!important.length) errors.important = 'Please pick at least one priority';
  if (!destChoice) errors.destChoice = 'Please select a destination preference';
  if (showDest && !destText.trim()) errors.destText = 'Please tell us which region or destination';
  return Object.keys(errors).length ? errors : null;
}

function SinglePillGroup({ id, options, value, onChange }) {
  return (
    <div className="pill-group" id={id}>
      {options.map((opt) => (
        <div
          key={opt.val}
          className={`pill${value === opt.val ? ' selected' : ''}`}
          onClick={() => onChange(opt.val)}
        >
          {opt.label}
        </div>
      ))}
    </div>
  );
}

function MultiPillGroup({ id, options, value, onChange }) {
  const toggle = (val) =>
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  return (
    <div className="pill-group" id={id}>
      {options.map((opt) => (
        <div
          key={opt.val}
          className={`pill${value.includes(opt.val) ? ' selected' : ''}`}
          onClick={() => toggle(opt.val)}
        >
          {opt.label}
        </div>
      ))}
    </div>
  );
}

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [stepErrors, setStepErrors] = useState({});
  const [submissionId, setSubmissionId] = useState(null);

  // Step 1
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [groupType, setGroupType] = useState('');
  const [kidsAges, setKidsAges] = useState('');

  // Step 2
  const [tripGoal, setTripGoal] = useState([]);
  const [pace, setPace] = useState('');
  const [accom, setAccom] = useState([]);
  const [budget, setBudget] = useState(2500);

  // Step 3
  const [dietary, setDietary] = useState([]);
  const [mobility, setMobility] = useState('');
  const [important, setImportant] = useState([]);
  const [destChoice, setDestChoice] = useState('');
  const [destText, setDestText] = useState('');

  // Step 4
  const [dreamDay, setDreamDay] = useState('');
  const [pastTrips, setPastTrips] = useState('');
  const [avoid, setAvoid] = useState('');
  const [other, setOther] = useState('');
  const [source, setSource] = useState('');

  const clearStepError = (field) =>
    setStepErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const goTo = async (n) => {
    // Only save when moving forward
    if (n > step) {
      if (step === 1) {
        const errors = validateStep1({
          firstName,
          email,
          departureDate,
          returnDate,
          departureCity,
          groupType,
          kidsAges,
          showKids: groupType === 'family-young' || groupType === 'family-teens',
        });
        if (errors) {
          setStepErrors(errors);
          setSubmitError(null);
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        setStepErrors({});
      }

      if (step === 2) {
        const errors = validateStep2({ tripGoal, pace, accom });
        if (errors) {
          setStepErrors(errors);
          setSubmitError(null);
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        setStepErrors({});
      }

      if (step === 3) {
        const errors = validateStep3({
          dietary,
          mobility,
          important,
          destChoice,
          destText,
          showDest: destChoice === 'region' || destChoice === 'specific',
        });
        if (errors) {
          setStepErrors(errors);
          setSubmitError(null);
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        setStepErrors({});
      }

      setSubmitting(true);
      setSubmitError(null);

      if (!supabase) {
        setSubmitting(false);
        setStep(n);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Collect the fields that belong to the current step
      const stepPayloads = {
        1: {
          first_name: firstName || null,
          email,
          departure_date: departureDate || null,
          return_date: returnDate || null,
          departure_city: departureCity || null,
          group_type: groupType || null,
          kids_ages: kidsAges || null,
          step_reached: Math.max(1, /* keep existing value if higher */ 1),
        },
        2: {
          trip_goals: tripGoal.length ? tripGoal : null,
          pace: pace || null,
          accommodation_style: accom.length ? accom : null,
          budget_per_person: budget ? Number(budget) : null,
          step_reached: 2,
        },
        3: {
          dietary: dietary.length ? dietary : null,
          mobility: mobility || null,
          priorities: important.length ? important : null,
          destination_choice: destChoice || null,
          destination_hint: destText || null,
          step_reached: 3,
        },
      };

      const payload = stepPayloads[step];

      if (!submissionId) {
        // Very first forward move — INSERT and store the id
        const { data, error } = await supabase
          .from('submissions')
          .insert(payload)
          .select('id')
          .single();

        setSubmitting(false);
        if (error) {
          setSubmitError('Could not save your details. Please try again.');
          console.error(error);
          return;
        }
        setSubmissionId(data.id);
      } else {
        // Row already exists (including if user went back and edited) — UPDATE
        const { error } = await supabase
          .from('submissions')
          .update(payload)
          .eq('id', submissionId);

        setSubmitting(false);
        if (error) {
          setSubmitError('Could not save your details. Please try again.');
          console.error(error);
          return;
        }
      }
    }

    setStep(n);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitForm = async () => {
    setSubmitting(true);
    setSubmitError(null);

    // Final UPDATE with step 4 data — row was already created on step 1
    if (!supabase || !submissionId) {
      setSubmitting(false);
      const params = new URLSearchParams();
      if (email) params.set('email', email);
      if (firstName) params.set('name', firstName);
      router.push(`/order?${params.toString()}`);
      return;
    }
    const { error } = await supabase
      .from('submissions')
      .update({
        dream_day: dreamDay || null,
        past_trips: pastTrips || null,
        avoid: avoid || null,
        other_notes: other || null,
        source: source || null,
        status: 'received',
        step_reached: 4,
      })
      .eq('id', submissionId);

    setSubmitting(false);

    if (error) {
      setSubmitError('Something went wrong. Please try again or email us directly.');
      console.error('Supabase update error:', error);
      return;
    }

    const params = new URLSearchParams();
    if (submissionId) params.set('sid', submissionId);
    if (email) params.set('email', email);
    if (firstName) params.set('name', firstName);
    router.push(`/order?${params.toString()}`);
  };

  const progress = (step / 4) * 100;
  const budgetDisplay = budget >= 10000 ? '$10,000+' : `~$${Number(budget).toLocaleString()}`;
  const showKids = groupType === 'family-young' || groupType === 'family-teens';
  const showDest = destChoice === 'region' || destChoice === 'specific';

  return (
    <>
      <Head>
        <title>Detour · Your Trip Brief</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="form-page-wrap">

        {/* Header */}
        <div className="form-header">
          <h1 className="form-h1">Tell us about<br />your <em>dream trip</em></h1>
          <p className="form-intro">Fill in the details below and we&apos;ll craft a fully personalised travel plan, delivered to your inbox within 24 hours.</p>
        </div>

        {/* Progress bar */}
        {!submitted && (
          <div className="progress-wrap">
            <div className="progress-labels">
              {STEP_LABELS.map((label, i) => (
                <span key={label} className={`progress-label${step === i + 1 ? ' active' : ''}`}>
                  {label} ({i + 1}/4)
                </span>
              ))}
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ── STEP 1: Basics ── */}
        {step === 1 && !submitted && (
          <div className="step-card">
            <div className="step-title">The basics</div>
            <div className="step-sub">Let&apos;s start with when, who, and where you&apos;re coming from.</div>

            <div className="field-row">
              <div className={`field${stepErrors.firstName ? ' has-error' : ''}`}>
                <label>Your first name <span className="required">*</span></label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearStepError('firstName'); }}
                  placeholder="e.g. Sophie"
                  required
                />
                {stepErrors.firstName && <span className="field-error">{stepErrors.firstName}</span>}
              </div>
              <div className={`field${stepErrors.email ? ' has-error' : ''}`}>
                <label>Your email <span className="required">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearStepError('email'); }}
                  placeholder="your@email.com"
                  required
                />
                {stepErrors.email && <span className="field-error">{stepErrors.email}</span>}
              </div>
            </div>

            <div className="field-row">
              <div className={`field${stepErrors.departureDate ? ' has-error' : ''}`}>
                <label>Departure date <span className="required">*</span></label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => { setDepartureDate(e.target.value); clearStepError('departureDate'); }}
                  required
                />
                {stepErrors.departureDate && <span className="field-error">{stepErrors.departureDate}</span>}
              </div>
              <div className={`field${stepErrors.returnDate ? ' has-error' : ''}`}>
                <label>Return date <span className="required">*</span></label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => { setReturnDate(e.target.value); clearStepError('returnDate'); }}
                  required
                />
                {stepErrors.returnDate && <span className="field-error">{stepErrors.returnDate}</span>}
              </div>
            </div>

            <div className={`field${stepErrors.departureCity ? ' has-error' : ''}`}>
              <label>Departing from <span className="required">*</span></label>
              <input
                type="text"
                value={departureCity}
                onChange={(e) => { setDepartureCity(e.target.value); clearStepError('departureCity'); }}
                placeholder="e.g. Paris, France"
                required
              />
              {stepErrors.departureCity && <span className="field-error">{stepErrors.departureCity}</span>}
            </div>

            <div className={`field${stepErrors.groupType ? ' has-error' : ''}`}>
              <label>Who&apos;s travelling? <span className="required">*</span></label>
              <SinglePillGroup
                id="groupType"
                value={groupType}
                onChange={(val) => { setGroupType(val); clearStepError('groupType'); }}
                options={[
                  { val: 'solo', label: 'Solo' },
                  { val: 'couple', label: 'Couple' },
                  { val: 'family-young', label: 'Family (young kids)' },
                  { val: 'family-teens', label: 'Family (teens)' },
                  { val: 'friends', label: 'Group of friends' },
                  { val: 'work', label: 'Work trip' },
                ]}
              />
              {stepErrors.groupType && <span className="field-error">{stepErrors.groupType}</span>}
            </div>

            {showKids && (
              <div className={`field${stepErrors.kidsAges ? ' has-error' : ''}`}>
                <label>How many children? (and ages) <span className="required">*</span></label>
                <input
                  type="text"
                  value={kidsAges}
                  onChange={(e) => { setKidsAges(e.target.value); clearStepError('kidsAges'); }}
                  placeholder="e.g. 2 kids, ages 4 and 7"
                  required
                />
                {stepErrors.kidsAges && <span className="field-error">{stepErrors.kidsAges}</span>}
              </div>
            )}

            {submitError && <div className="submit-error">{submitError}</div>}
            <div className="nav-row">
              <button className="btn-next" onClick={() => goTo(2)} disabled={submitting}>
                {submitting ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Travel Style ── */}
        {step === 2 && !submitted && (
          <div className="step-card">
            <div className="step-title">Your travel style</div>
            <div className="step-sub">Help us understand the vibe you&apos;re after.</div>

            <div className={`field${stepErrors.tripGoal ? ' has-error' : ''}`}>
              <label>Trip goal — pick all that apply <span className="required">*</span></label>
              <MultiPillGroup
                id="tripGoal"
                value={tripGoal}
                onChange={(val) => { setTripGoal(val); clearStepError('tripGoal'); }}
                options={[
                  { val: 'relax', label: 'Relax & recharge' },
                  { val: 'adventure', label: 'Adventure & outdoors' },
                  { val: 'culture', label: 'Culture & history' },
                  { val: 'food', label: 'Food & gastronomy' },
                  { val: 'nightlife', label: 'Nightlife & social' },
                  { val: 'nature', label: 'Nature & wildlife' },
                  { val: 'wellness', label: 'Wellness & spa' },
                  { val: 'city', label: 'Urban exploration' },
                  { val: 'romance', label: 'Romance' },
                ]}
              />
              {stepErrors.tripGoal && <span className="field-error">{stepErrors.tripGoal}</span>}
            </div>

            <div className={`field${stepErrors.pace ? ' has-error' : ''}`}>
              <label>Pace preference <span className="required">*</span></label>
              <SinglePillGroup
                id="pace"
                value={pace}
                onChange={(val) => { setPace(val); clearStepError('pace'); }}
                options={[
                  { val: 'slow', label: 'Slow & relaxed' },
                  { val: 'balanced', label: 'Balanced' },
                  { val: 'packed', label: 'See everything' },
                ]}
              />
              {stepErrors.pace && <span className="field-error">{stepErrors.pace}</span>}
            </div>

            <div className={`field${stepErrors.accom ? ' has-error' : ''}`}>
              <label>Accommodation style <span className="required">*</span></label>
              <MultiPillGroup
                id="accom"
                value={accom}
                onChange={(val) => { setAccom(val); clearStepError('accom'); }}
                options={[
                  { val: 'budget', label: 'Budget / hostel' },
                  { val: 'midrange', label: 'Mid-range hotel' },
                  { val: 'boutique', label: 'Boutique / design' },
                  { val: 'luxury', label: 'Luxury resort' },
                  { val: 'airbnb', label: 'Apartment / Airbnb' },
                  { val: 'unique', label: 'Unique stays (treehouses, etc.)' },
                ]}
              />
              {stepErrors.accom && <span className="field-error">{stepErrors.accom}</span>}
            </div>

            <div className="field">
              <label>Overall budget per person (excl. flights) <span className="required">*</span></label>
              <div className="range-wrap">
                <input
                  type="range"
                  min="500" max="10000" step="250"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <div className="range-labels">
                  <span>$500</span>
                  <span>$10,000+</span>
                </div>
                <div className="range-value">{budgetDisplay}</div>
              </div>
            </div>

            {submitError && <div className="submit-error">{submitError}</div>}
            <div className="nav-row">
              <button className="btn-back" onClick={() => goTo(1)} disabled={submitting}>← Back</button>
              <button className="btn-next" onClick={() => goTo(3)} disabled={submitting}>
                {submitting ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preferences ── */}
        {step === 3 && !submitted && (
          <div className="step-card">
            <div className="step-title">Preferences &amp; needs</div>
            <div className="step-sub">These details help us tailor every recommendation.</div>

            <div className={`field${stepErrors.dietary ? ' has-error' : ''}`}>
              <label>Dietary requirements — pick all that apply <span className="required">*</span></label>
              <MultiPillGroup
                id="dietary"
                value={dietary}
                onChange={(val) => { setDietary(val); clearStepError('dietary'); }}
                options={[
                  { val: 'none', label: 'No restrictions' },
                  { val: 'vegetarian', label: 'Vegetarian' },
                  { val: 'vegan', label: 'Vegan' },
                  { val: 'halal', label: 'Halal' },
                  { val: 'kosher', label: 'Kosher' },
                  { val: 'glutenfree', label: 'Gluten-free' },
                  { val: 'allergies', label: 'Food allergies' },
                ]}
              />
              {stepErrors.dietary && <span className="field-error">{stepErrors.dietary}</span>}
            </div>

            <div className={`field${stepErrors.mobility ? ' has-error' : ''}`}>
              <label>Mobility or accessibility needs? <span className="required">*</span></label>
              <SinglePillGroup
                id="mobility"
                value={mobility}
                onChange={(val) => { setMobility(val); clearStepError('mobility'); }}
                options={[
                  { val: 'none', label: 'No specific needs' },
                  { val: 'some', label: 'Some considerations' },
                  { val: 'full', label: 'Full accessibility required' },
                ]}
              />
              {stepErrors.mobility && <span className="field-error">{stepErrors.mobility}</span>}
            </div>

            <div className={`field${stepErrors.important ? ' has-error' : ''}`}>
              <label>Important to you — pick all that apply <span className="required">*</span></label>
              <MultiPillGroup
                id="important"
                value={important}
                onChange={(val) => { setImportant(val); clearStepError('important'); }}
                options={[
                  { val: 'safety', label: 'High safety rating' },
                  { val: 'lgbtq', label: 'LGBTQ+ friendly' },
                  { val: 'eco', label: 'Eco / sustainable' },
                  { val: 'offbeaten', label: 'Off the beaten path' },
                  { val: 'instagram', label: 'Photogenic / instagrammable' },
                  { val: 'family', label: 'Family-friendly' },
                  { val: 'english', label: 'English spoken widely' },
                  { val: 'lowcrowds', label: 'Avoid tourist crowds' },
                ]}
              />
              {stepErrors.important && <span className="field-error">{stepErrors.important}</span>}
            </div>

            <div className={`field${stepErrors.destChoice ? ' has-error' : ''}`}>
              <label>Do you have a destination in mind, or are you open? <span className="required">*</span></label>
              <SinglePillGroup
                id="destChoice"
                value={destChoice}
                onChange={(val) => { setDestChoice(val); clearStepError('destChoice'); }}
                options={[
                  { val: 'open', label: 'Fully open — surprise me' },
                  { val: 'region', label: 'I have a region in mind' },
                  { val: 'specific', label: 'I have a destination in mind' },
                ]}
              />
              {stepErrors.destChoice && <span className="field-error">{stepErrors.destChoice}</span>}
            </div>

            {showDest && (
              <div className={`field${stepErrors.destText ? ' has-error' : ''}`}>
                <label>Which region or destination? <span className="required">*</span></label>
                <input
                  type="text"
                  value={destText}
                  onChange={(e) => { setDestText(e.target.value); clearStepError('destText'); }}
                  placeholder="e.g. Southeast Asia, or Japan"
                  required
                />
                {stepErrors.destText && <span className="field-error">{stepErrors.destText}</span>}
              </div>
            )}

            {submitError && <div className="submit-error">{submitError}</div>}
            <div className="nav-row">
              <button className="btn-back" onClick={() => goTo(2)} disabled={submitting}>← Back</button>
              <button className="btn-next" onClick={() => goTo(4)} disabled={submitting}>
                {submitting ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Final Details ── */}
        {step === 4 && !submitted && (
          <div className="step-card">
            <div className="step-title">A few final touches</div>
            <div className="step-sub">The more you share, the more personal your plan will be.</div>

            <div className="info-box">
              ✦ This is the section most people skip — but it&apos;s where the magic happens. The more specific you are, the better your brief will be.
            </div>

            <div className="field">
              <label>Describe your dream day on this trip</label>
              <textarea
                value={dreamDay}
                onChange={(e) => setDreamDay(e.target.value)}
                placeholder="e.g. Wake up late, great coffee, a long walk through an interesting neighbourhood, a meal that surprises me, back for sunset somewhere beautiful..."
              />
            </div>

            <div className="field">
              <label>Any past trips you loved? (and why)</label>
              <textarea
                value={pastTrips}
                onChange={(e) => setPastTrips(e.target.value)}
                placeholder="e.g. Loved Lisbon because of the tiles, the hills, the seafood and how walkable it was. Tokyo was overwhelming but amazing for the food."
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="field">
              <label>Anything you definitely want to avoid?</label>
              <textarea
                value={avoid}
                onChange={(e) => setAvoid(e.target.value)}
                placeholder="e.g. No beach resorts, no long coach tours, avoid overly touristy restaurants..."
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="field">
              <label>Anything else we should know?</label>
              <textarea
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="e.g. It's our anniversary, I have a bad knee, we're celebrating a big birthday..."
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="form-divider" />

            <div className="field">
              <label>How did you hear about Detour?</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">— Select —</option>
                <option>Google / Search</option>
                <option>Instagram</option>
                <option>TikTok</option>
                <option>Reddit</option>
                <option>Friend / Word of mouth</option>
                <option>Other</option>
              </select>
            </div>

            {submitError && <div className="submit-error">{submitError}</div>}
            <div className="nav-row">
              <button className="btn-back" onClick={() => goTo(3)} disabled={submitting}>← Back</button>
              <button className="btn-submit" onClick={submitForm} disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit my brief ✦'}
              </button>
            </div>
          </div>
        )}

        {/* ── Confirmation ── */}
        {submitted && (
          <div className="confirm-screen">
            <div className="confirm-icon">✦</div>
            <h2>You&apos;re all set.</h2>
            <p>
              Your trip brief is in our hands. We&apos;ll have your personalised plan ready and delivered to{' '}
              <strong>{email || 'your inbox'}</strong> within <strong>24 hours</strong>.
            </p>
            <div className="delivery-badge">📬 Delivery within 24 hours</div>
            <div className="form-divider" />
            <p style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>
              Keep an eye on your inbox (and spam, just in case). While you wait, we might reach out with one quick clarifying question.
            </p>
          </div>
        )}

      </div>
    </>
  );
}
