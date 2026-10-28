import developerPhoto from './assets/developer.jpeg';

import hcplLogo from './assets/hcpl-logo.jpeg.jpeg';



import React from 'react';

import { createRoot } from 'react-dom/client';

import { MapPin, CalendarDays, Users, Trophy, ArrowRight, ShieldCheck, Star, Menu, X, ClipboardList, IndianRupee, Play, Zap, CheckCircle2, LoaderCircle } from 'lucide-react';

import './styles.css';

import AdminPage from './Admin.jsx';



const API_BASE = import.meta.env.VITE_API_URL || '';



const awards = [

  { title: 'Best Batsman', prize: 'LED TV', icon: '📺' },

  { title: 'Best Bowler', prize: 'Refrigerator', icon: '🧊' },

  { title: 'Man of the Series', prize: 'Sofa Set', icon: '🛋️' },

  { title: 'Final Man of the Match', prize: 'Cycle', icon: '🚲' },

  { title: 'Most Sixes', prize: 'Mini Cooler', icon: '❄️' },

  { title: 'Most Fours', prize: 'Iron Press', icon: '♨️' },

  { title: 'Best Catch', prize: 'Table Fan + ₹1,100', icon: '🌀' },

  { title: 'Best Fielder', prize: 'Samsung Guru + ₹1,100', icon: '📱' },

  { title: 'Fair Play Award', prize: 'Induction', icon: '🏅' },

  { title: 'Third Umpire Review', prize: 'System Available', icon: '📺' },

];

const prizes = [

  { place: 'WINNER', amount: '₹1,00,000', icon: '🏆', cls: 'gold' },

  { place: 'RUNNER UP', amount: '₹50,000', icon: '🏆', cls: 'silver' },

  { place: '3RD PRIZE', amount: '₹25,000', icon: '🏆', cls: 'bronze' },

  { place: '4TH PRIZE', amount: '₹25,000', icon: '🏆', cls: 'bronze' },

];

function App() {

  const [menuOpen, setMenuOpen] = React.useState(false);

  const [showRules, setShowRules] = React.useState(false);

  const [registration, setRegistration] = React.useState({ fullName: '', age: '', fatherName: '', phone: '', aadhaarNumber: '', dateOfBirth: '', address: '', district: 'Hamirpur', pincode: '', battingHand: '', fastBowling: '', kitSize: '', playerPhoto: '' });

  const [photoError, setPhotoError] = React.useState('');

  const [registrationState, setRegistrationState] = React.useState({ loading: false, message: '', error: '', registrationId: '' });

  const nav = [['Home', '#home'], ['About', '#about'], ['Tournament', '#tournament'], ['Prizes', '#prizes'], ['Rules', '#rules'], ['Gallery', '#gallery'], ['Contact', '#contact']];

  return <div className="site-shell">

    <header className="navbar">

      <a className="brand" href="#home" aria-label="Harshit Cup home">

        <img

          src={hcplLogo}

          alt="Harshit Cup HCPL"

          className="brand-logo-img"

        />

      </a>

      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>

      <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>{nav.map(([name, link]) => <a key={name} href={link} onClick={() => setMenuOpen(false)}>{name}</a>)}</nav>

      <a className="btn btn-yellow nav-cta" href="#register">Register Now <ArrowRight size={16} /></a>

    </header>



    <main>

      <section className="hero" id="home">

        <div className="hero-photo" />

        <div className="paint paint-left" /><div className="paint paint-bottom" />

        <div className="hero-copy">

          <p className="eyebrow">HN NAYI DISHA FOUNDATION <span>PRESENTS</span></p>

          <h1>HARSHIT <em>CUP</em></h1>

          <h2>CHHIMAULI PREMIER LEAGUE</h2>

          <div className="season">SEASON 3 <i /> HCPL</div>

          <p className="hero-tagline">LOCAL TALENT <b>·</b> BIG DREAMS <b>·</b> STRONGER COMMUNITY</p>

          <div className="hero-facts">

            <div><MapPin /><span><b>Chhimauli</b><small>Hamirpur, Uttar Pradesh</small></span></div>

            <div><CalendarDays /><span><b>Coming Soon</b><small>Tournament Dates</small></span></div>

            <div><Users /><span><b>Hamirpur District</b><small>Only</small></span></div>

            <div><Trophy /><span><b>Local Talent</b><small>Big Dreams</small></span></div>

          </div>

          <div className="hero-actions"><a className="btn btn-yellow" href="#register">Register Now <ArrowRight size={17} /></a><a className="btn btn-outline" href="#tournament">View Tournament Details</a></div>

        </div>

        <div className="hero-side-note"><span>CRICKET</span><span>UNITES</span><span>US <b>✦</b></span><small>Game Beyond Boundaries</small></div>

        <div className="hero-player-label">HCPL <strong>03</strong></div>

      </section>



      <section className="prize-section section-pad" id="prizes">

        <div className="section-heading"><span className="heading-rule" /><div><h2><Trophy size={25} /> PRIZE POOL</h2><p>TOTAL PRIZE POOL & SPECIAL AWARDS</p></div><span className="heading-rule" /></div>

        <div className="prize-layout"><div className="prize-grid">{prizes.map(p => <article className={`prize-card ${p.cls}`} key={p.place}><div className="trophy-icon">{p.icon}</div><h3>{p.place}</h3><strong>{p.amount}</strong></article>)}</div>

          <a className="promo-card" href="#gallery"><img src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=85" alt="Cricket ground" /><span className="play-button"><Play fill="currentColor" size={22} /></span><b>FEEL THE<br /><em>Cricket Fever</em></b><small>Explore tournament highlights <ArrowRight size={12} /></small></a>

        </div>

      </section>



      <section className="content-grid" id="about">

        <article className="about-panel"><p className="brush-label">ABOUT <em>HARSHIT CUP</em></p><p>Harshit Cup Cricket League (HCPL) is an initiative by HN Nayi Disha Foundation to promote local cricket talent in Hamirpur district. A platform for young players to showcase their skills, chase their dreams, and be part of something bigger than just a game.</p><div className="values"><div><Trophy /><b>Local Talent</b></div><div><Star /><b>Big Dreams</b></div><div><Users /><b>Stronger Community</b></div><div><ShieldCheck /><b>Fair Play</b></div></div><a className="btn btn-yellow" href="#tournament">Know More <ArrowRight size={15} /></a><div className="batter-silhouette">🏏</div></article>

        <section className="awards-panel" id="tournament"><h2><Star size={20} fill="currentColor" /> SPECIAL AWARDS</h2><div className="awards-grid">{awards.map(a => <article className="award-card" key={a.title}><span>{a.icon}</span><b>{a.title}</b><strong>{a.prize}</strong></article>)}</div></section>

        <aside className="info-panel"><div className="district-banner"><MapPin size={17} /> ONLY FOR HAMIRPUR DISTRICT</div><div className="info-stats"><div><Users /><b>12+</b><small>Teams Expected*</small></div><div><IndianRupee /><b>₹700</b><small>Registration Fee</small></div><div><Trophy /><b>Big Prizes</b><small>& Special Awards</small></div><div><CalendarDays /><b>Live Updates</b><small>During Tournament</small></div></div><div className="location-line"><MapPin /><span>Chhimauli, Hamirpur (UP)</span><button onClick={() => setShowRules(!showRules)}>{showRules ? 'Hide Rules' : 'View Rules'} <ArrowRight size={14} /></button></div>{showRules && <div className="rules-box" id="rules"><b>Eligibility & registration</b><p>Open to eligible players from Hamirpur district only. Registration fee: ₹700. Final dates, team limits and tournament rules will be announced by the organizers.</p></div>}<small className="estimate-note">*Expected team count is a placeholder and should be confirmed by the organizer.</small></aside>

      </section>



      <section className="gallery-section section-pad" id="gallery"><div className="gallery-title"><div><span className="mini-eyebrow">THE ENERGY. THE PASSION.</span><h2>TOURNAMENT <em>GALLERY</em></h2></div><a href="#contact" className="btn btn-outline">View All <ArrowRight size={15} /></a></div><div className="gallery-grid"><img src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=85" alt="Cricket batsman at a match" /><img src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=85" alt="Cricket match action" /><img src="https://images.unsplash.com/photo-1624897174291-1bd715e371d5?auto=format&fit=crop&w=800&q=85" alt="Cricket player on field" /><img src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=800&q=85" alt="Cricket stadium" /></div><p className="gallery-note">.</p></section>



      <section className="register-banner" id="register"><div><span className="mini-eyebrow">YOUR MOMENT. YOUR GAME.</span><h2>READY TO <em>PLAY?</em></h2><p>Player registration for HCPL Season 3 · ₹700 fee</p></div><a className="btn btn-black" href="#registration-form">Start Registration <ArrowRight size={17} /></a><div className="banner-ball">🏏</div></section>

      <section className="registration-section section-pad" id="registration-form">

        <div className="registration-intro"><span className="mini-eyebrow">HCPL SEASON 3 · PLAYER ENTRY</span><h2>PLAYER <em>REGISTRATION</em></h2><p>Complete the form below to begin your registration. Eligibility is limited to Hamirpur district, as announced on the tournament poster.</p><div className="registration-fee"><IndianRupee /><span><small>REGISTRATION FEE</small><strong>₹700</strong></span></div></div>

        <form className="registration-form" onSubmit={async (event) => {

          event.preventDefault();

          setRegistrationState({ loading: true, message: '', error: '', registrationId: '' });

          try {

            const response = await fetch(`${API_BASE}/api/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: registration.fullName.trim(), age: Number(registration.age), fatherName: registration.fatherName.trim(), phone: registration.phone.trim(), aadhaarNumber: registration.aadhaarNumber.trim(), dateOfBirth: registration.dateOfBirth, address: registration.address.trim(), district: registration.district.trim(), pincode: registration.pincode.trim(), battingHand: registration.battingHand, fastBowling: registration.fastBowling, kitSize: registration.kitSize, playerPhoto: registration.playerPhoto }) });

            const responseText = await response.text();

            const result = responseText ? JSON.parse(responseText) : {};

            if (!response.ok) throw new Error(result.message || 'Unable to submit registration. Please try again.');

            setRegistrationState({ loading: false, message: 'Your details have been saved as pending. Complete payment to confirm your registration.', error: '', registrationId: result.registrationId });

            const orderResponse = await fetch(`${API_BASE}/api/payments/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: result.registrationId }) });

            const order = await orderResponse.json();

            if (!orderResponse.ok) throw new Error(order.message || 'Registration saved, but online payment is not configured yet. Please contact the organizer with your registration ID.');

            if (!window.Razorpay) {

              await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = () => reject(new Error('Could not load the payment window. Please check your internet connection.')); document.body.appendChild(script); });

            }

            const checkout = new window.Razorpay({

              key: order.keyId, amount: order.amount, currency: order.currency || 'INR', name: 'HN Nayi Disha Foundation', description: 'HCPL Season 3 Player Registration', order_id: order.orderId, prefill: { name: registration.fullName.trim(), contact: registration.phone.trim() }, theme: { color: '#ffd400' }, handler: async (payment) => {

                try {

                  const verifyResponse = await fetch(`${API_BASE}/api/payments/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: result.registrationId, razorpay_order_id: payment.razorpay_order_id, razorpay_payment_id: payment.razorpay_payment_id, razorpay_signature: payment.razorpay_signature }) });

                  const verified = await verifyResponse.json();

                  if (!verifyResponse.ok) throw new Error(verified.message || 'Payment verification failed. Contact the organizer before retrying.');

                  setRegistrationState({ loading: false, message: 'Payment verified successfully. Your registration is confirmed.', error: '', registrationId: result.registrationId });

                } catch (err) { setRegistrationState({ loading: false, message: '', error: `${err.message} Keep your registration ID for reference.`, registrationId: result.registrationId }); }

              }

            });

            checkout.on('payment.failed', (failure) => setRegistrationState({ loading: false, message: '', error: failure.error?.description || 'Payment was not completed. Your registration remains pending.', registrationId: result.registrationId }));

            checkout.open();

          } catch (error) {

            setRegistrationState((previous) => ({ ...previous, loading: false, error: error.message || 'Something went wrong.', message: previous.registrationId ? previous.message : '' }));

          }

        }}>

          <div className="form-heading"><div><span>01 / PLAYER DETAILS</span><h3>Tell us about yourself</h3></div><span className="required-note">* Required fields</span></div>

          <div className="form-grid">

            <label className="form-full">Full name *<input required minLength="2" maxLength="100" autoComplete="name" value={registration.fullName} onChange={e => setRegistration({ ...registration, fullName: e.target.value })} placeholder="Enter your full name" /></label>

            <label>Age *<input required type="number" min="10" max="80" value={registration.age} onChange={e => setRegistration({ ...registration, age: e.target.value })} placeholder="Enter your age" /></label>

            <label>Father's name *<input required minLength="2" maxLength="100" value={registration.fatherName} onChange={e => setRegistration({ ...registration, fatherName: e.target.value })} placeholder="Enter father's name" /></label>

            <label>Mobile number *<input required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" autoComplete="tel" value={registration.phone} onChange={e => setRegistration({ ...registration, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile number" /></label>

            <label>Aadhaar number *<input required type="password" inputMode="numeric" pattern="[0-9]{12}" maxLength="12" title="Enter a valid 12-digit Aadhaar number" autoComplete="off" value={registration.aadhaarNumber} onChange={e => setRegistration({ ...registration, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })} placeholder="12-digit Aadhaar number" /></label>

            <label>Date of birth *<input required type="date" max={new Date().toISOString().slice(0, 10)} value={registration.dateOfBirth} onChange={e => setRegistration({ ...registration, dateOfBirth: e.target.value })} /></label>

            <label>District *<select required value={registration.district} onChange={e => setRegistration({ ...registration, district: e.target.value })}><option value="Hamirpur">Hamirpur, Uttar Pradesh</option><option value="Other">Other district</option></select></label>

            <label className="form-full">Full address *<textarea required minLength="8" maxLength="300" autoComplete="street-address" rows="3" value={registration.address} onChange={e => setRegistration({ ...registration, address: e.target.value })} placeholder="Village / town, post office, and locality" /></label>

            <label>PIN code<input inputMode="numeric" pattern="[0-9]{6}" title="Enter a 6-digit PIN code" autoComplete="postal-code" value={registration.pincode} onChange={e => setRegistration({ ...registration, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit PIN code (optional)" /></label>

            <div className="player-photo-field">

              <label htmlFor="playerPhoto">Player photo * <span className="photo-help">JPG, PNG or WEBP · Maximum 10 MB (original photo, not compressed)</span></label>

              <input
                id="playerPhoto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required={!registration.playerPhoto}
                onChange={e => {
                  const file = e.target.files?.[0];
                  setPhotoError('');

                  if (!file) return;

                  if (!file.type.startsWith('image/')) {
                    setPhotoError('Please choose a valid image.');
                    e.target.value = '';
                    return;
                  }

                  if (file.size > 10 * 1024 * 1024) {
                    setPhotoError('Photo must be 10 MB or smaller.');
                    e.target.value = '';
                    return;
                  }

                  const reader = new FileReader();

                  reader.onload = () => {
                    setRegistration(previous => ({
                      ...previous,
                      playerPhoto: reader.result
                    }));
                  };

                  reader.onerror = () => {
                    setPhotoError('Could not read this photo. Please try another image.');
                  };

                  reader.readAsDataURL(file);
                }}
              />
              {registration.playerPhoto && <img className="player-photo-preview" src={registration.playerPhoto} alt="Player photo preview" />}

              {photoError && <span className="photo-error" role="alert">{photoError}</span>}

            </div>

          </div>

          <div className="skills-box">

            <h4>Player skill level (Batting / Bowler)</h4>

            <fieldset>

              <legend>Batsman</legend>



              <label className="choice-option">

                <input

                  type="radio"

                  name="battingHand"

                  required

                  checked={registration.battingHand === 'Right Hand'}

                  onChange={() => setRegistration({ ...registration, battingHand: 'Right Hand' })}

                />

                Right Hand

              </label>



              <label className="choice-option">

                <input

                  type="radio"

                  name="battingHand"

                  checked={registration.battingHand === 'Left Hand'}

                  onChange={() => setRegistration({ ...registration, battingHand: 'Left Hand' })}

                />

                Left Hand

              </label>

            </fieldset>

            <fieldset><legend>Bowler (Fast)</legend>

              {['Right Hand', 'Fast-Medium', 'Medium-fast'].map(option => <label className="choice-option" key={option}><input type="radio" name="fastBowling" required checked={registration.fastBowling === option} onChange={() => setRegistration({ ...registration, fastBowling: option })} /> {option}</label>)}

              <label className="choice-option"><input type="radio" name="fastBowling" checked={registration.fastBowling === 'Not a fast bowler'} onChange={() => setRegistration({ ...registration, fastBowling: 'Not a fast bowler' })} /> Not applicable</label>

            </fieldset>

            <fieldset><legend>Please choose kit size *</legend>

              {['S', 'M', 'L', 'XL', 'XXL'].map(option => <label className="choice-option" key={option}><input type="radio" name="kitSize" required checked={registration.kitSize === option} onChange={() => setRegistration({ ...registration, kitSize: option })} /> {option}</label>)}

            </fieldset>

          </div>

          {registrationState.error && <div className="form-alert form-error" role="alert">{registrationState.error}{registrationState.registrationId && <span> Registration ID: <b>{registrationState.registrationId}</b></span>}</div>}

          {registrationState.message && <div className="form-alert form-success" role="status"><CheckCircle2 size={20} /><span>{registrationState.message}{registrationState.registrationId && <><br />Registration ID: <b>{registrationState.registrationId}</b></>}</span></div>}

          <div className="form-submit-row"><p>Payment is processed securely by Razorpay when configured. Your registration is not confirmed until payment verification succeeds.</p><button className="btn btn-yellow" type="submit" disabled={registrationState.loading}>{registrationState.loading ? <><LoaderCircle className="spin" size={17} /> Processing…</> : <>Submit & Pay ₹700 <ArrowRight size={17} /></>}</button></div>

        </form>

      </section>

      <section className="contact-strip" id="contact"><div><span className="contact-icon"><ClipboardList /></span><div><b>Registration & enquiries</b><small>Contact the HCPL organizing committee for official registration details.</small></div></div><div><span className="contact-icon"><Zap /></span><div><b>HN Nayi Disha Foundation</b><small>Harshit Cup · Chhimauli, Hamirpur, Uttar Pradesh</small></div></div><a className="btn btn-yellow" href="mailto:hcpl@example.com?subject=HCPL%20Season%203%20Enquiry">Contact Organizer <ArrowRight size={15} /></a></section>

    </main>

    <footer className="site-footer">

      <a className="brand" href="#home">

        <img src={hcplLogo} alt="Harshit Cup HCPL" className="brand-logo-img" />

      </a>



      <p>Presented by HN Nayi Disha Foundation</p>



      <div className="developer-credit">

        <img src={developerPhoto} alt="Ishan Khan" />

        <div>

          <span>DESIGNED & DEVELOPED BY</span>

          <strong>Ishan Khan</strong>

          <small>Full Stack Developer</small>

        </div>

      </div>



      <span>© {new Date().getFullYear()} HCPL Season 3. All rights reserved.</span>

    </footer>

  </div>

}

const root = createRoot(document.getElementById('root'));

root.render(
  window.location.pathname.replace(/\/+$/, '') === '/admin'
    ? <AdminPage />
    : <App />
);
