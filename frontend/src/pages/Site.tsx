import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Check, Download, Lock, Mic, Monitor, Smartphone } from 'lucide-react';
import { DOWNLOAD_URL, RELEASES_URL } from '../lib/platform';

export const SiteLayout: React.FC = () => (
  <div className="site">
    <header className="site-nav">
      <div className="site-nav__in">
        <Link to="/" className="site-brand">
          <span className="nav__mark" aria-hidden>Q</span> QuoteFlow
        </Link>
        <nav className="site-links" aria-label="Site">
          <Link to="/#how">How it works</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/download">Download</Link>
          <Link to="/app" className="btn btn--primary">Try it now</Link>
        </nav>
      </div>
    </header>
    <Outlet />
    <footer className="site-foot">
      <span>© {new Date().getFullYear()} QuoteFlow. Built for the trades.</span>
      <nav aria-label="Footer">
        <Link to="/download">Download</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
    </footer>
  </div>
);

export const Landing: React.FC = () => (
  <main>
    <section className="hero">
      <div className="hero__in">
        <div className="rise">
          <span className="eyebrow">For plumbers, electricians, HVAC and remodelers</span>
          <h1>
            Describe the job.<br />
            <em>Send the estimate.</em>
          </h1>
          <p className="hero__lead">
            Talk through the work the way you would to a coworker. QuoteFlow turns it into a priced, professional estimate in minutes, not an evening at the kitchen table.
          </p>
          <div className="hero__cta">
            <Link to="/download" className="btn btn--primary btn--lg">
              <Download size={20} aria-hidden /> Download for Windows
            </Link>
            <Link to="/app" className="btn btn--secondary btn--lg">Try it in your browser</Link>
          </div>
          <p className="hero__note">
            <Lock size={16} aria-hidden /> No account needed. Your customers and business details stay on your device.
          </p>
        </div>

        <div className="mock rise" aria-label="Example estimate">
          <div className="mock__bar">
            <span className="mic" aria-hidden><Mic /></span>
            “Swap the old tank for a tankless, upsize the gas line, pull the permit…”
          </div>
          <h3>Tankless water heater swap</h3>
          <p className="sub">Example estimate</p>
          <div className="mock__line"><span>Tankless unit and vent kit</span><span className="num">$1,945.00</span></div>
          <div className="mock__line"><span>Gas line upsizing</span><span className="num">$455.00</span></div>
          <div className="mock__line"><span>Labor, 8.5 hours</span><span className="num">$977.50</span></div>
          <div className="mock__line"><span>Permit and inspection</span><span className="num">$185.00</span></div>
          <div className="mock__total"><span className="muted">Total</span><b className="num">$3,962.50</b></div>
          <span className="mock__send">Send to customer</span>
        </div>
      </div>
    </section>

    <section className="section" id="how">
      <h2>From job site to sent in three steps</h2>
      <p className="section__lead">No spreadsheets, no templates to maintain, no guessing what the going rate is.</p>
      <div className="steps-3">
        <div className="step-card">
          <div className="n">1</div>
          <h3>Say the job</h3>
          <p>Tap the mic and describe the work, or type it. Add the customer and you’re done.</p>
        </div>
        <div className="step-card">
          <div className="n">2</div>
          <h3>Check the price</h3>
          <p>You get line items, local labor rates, and a total with your margin and tax. Adjust anything.</p>
        </div>
        <div className="step-card">
          <div className="n">3</div>
          <h3>Send and track it</h3>
          <p>Text it, email it, or download the PDF. Mark it won or lost so you can see how you’re doing.</p>
        </div>
      </div>
    </section>

    <section className="section--tint section">
      <div className="section__in">
        <div className="two-col">
          <div>
            <h2>Nothing to set up. Really.</h2>
            <p className="section__lead">
              The desktop app prepares everything the first time you open it. You pick your country, we handle the rest.
            </p>
          </div>
          <ul className="tick-list">
            <li><Check size={20} aria-hidden /><div><b>One installer</b><span>No terminals, no extra downloads to hunt for.</span></div></li>
            <li><Check size={20} aria-hidden /><div><b>Writes estimates on your own computer</b><span>After a one-time setup, your job notes never leave your PC.</span></div></li>
            <li><Check size={20} aria-hidden /><div><b>Your currency and tax</b><span>Dollars, pounds, rupees. Sales tax, VAT, GST. Set once.</span></div></li>
            <li><Check size={20} aria-hidden /><div><b>Works on a weak PC too</b><span>If your computer can’t run it locally, QuoteFlow switches to online mode for you.</span></div></li>
          </ul>
        </div>
      </div>
    </section>

    <section className="section">
      <h2>Made for the trades</h2>
      <div className="trades">
        {['Plumbing', 'Electrical', 'HVAC', 'Remodeling', 'Roofing', 'Painting', 'Landscaping', 'General contracting'].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </section>

    <section className="section--tint section">
      <div className="section__in">
        <h2>What you need for the desktop app</h2>
        <p className="section__lead">One installer. Open it once. QuoteFlow prepares the rest.</p>
        <dl className="reqs">
          <div><dt>Windows</dt><dd>10 or 11, 64-bit</dd></div>
          <div><dt>Memory</dt><dd>8 GB or more recommended</dd></div>
          <div><dt>Disk</dt><dd>About 5 GB, one time</dd></div>
          <div><dt>Internet</dt><dd>Only for first-time setup</dd></div>
        </dl>
        <p className="muted" style={{ marginTop: 20 }}>
          Prefer not to install? <Link to="/app">Try the web demo</Link> — a mobile app is coming later.
        </p>
      </div>
    </section>

    <section style={{ paddingBottom: 24 }}>
      <div className="final" style={{ maxWidth: 1112, marginInline: 'auto' }}>
        <h2>Win the job before the other quote lands.</h2>
        <p>Send a clear, professional estimate while you’re still standing in the kitchen.</p>
        <div className="hero__cta">
          <Link to="/download" className="btn btn--primary btn--lg">
            <Download size={20} aria-hidden /> Download for Windows
          </Link>
          <Link to="/app" className="btn btn--secondary btn--lg">Try it in your browser</Link>
        </div>
      </div>
    </section>
  </main>
);

export const DownloadPage: React.FC = () => (
  <main className="legal">
    <h1>Download QuoteFlow</h1>
    <p className="muted" style={{ marginBottom: 28, fontSize: '1.0625rem' }}>One installer. Open it once, pick your country, and start quoting.</p>

    <div className="card dl-card">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span className="row__icon" style={{ width: 52, height: 52 }}><Monitor size={26} aria-hidden /></span>
        <div>
          <h2>QuoteFlow for Windows</h2>
          <p className="muted">Windows 10 or 11, 64-bit · NSIS installer</p>
        </div>
      </div>
      {DOWNLOAD_URL ? (
        <a className="btn btn--primary btn--lg" href={DOWNLOAD_URL}>
          <Download size={20} aria-hidden /> Download installer
        </a>
      ) : (
        <a className="btn btn--primary btn--lg" href={RELEASES_URL} target="_blank" rel="noreferrer">
          <Download size={20} aria-hidden /> Get Windows installer
        </a>
      )}
      <p className="muted" style={{ marginTop: 12, fontSize: '0.9rem' }}>
        {DOWNLOAD_URL
          ? 'Early builds may be unsigned. Windows SmartScreen can warn — choose “More info” → “Run anyway” only for installers from this site or our GitHub Releases.'
          : 'Opens GitHub Releases. After CI publishes a tag (v0.1.0), the .exe appears there. Set VITE_DOWNLOAD_URL on Render for a one-click download.'}
      </p>
    </div>

    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', margin: '36px 0 4px' }}>What you need</h2>
    <dl className="reqs">
      <div><dt>Memory</dt><dd>8 GB or more recommended</dd></div>
      <div><dt>Disk space</dt><dd>About 5 GB, one time</dd></div>
      <div><dt>Internet</dt><dd>Only for first-time setup</dd></div>
    </dl>

    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', margin: '36px 0 8px' }}>The first time you open it</h2>
    <ul className="tick-list">
      <li><Check size={20} aria-hidden /><div><b>QuoteFlow prepares itself</b><span>It downloads what it needs and shows you progress. This takes a few minutes, once.</span></div></li>
      <li><Check size={20} aria-hidden /><div><b>You answer three quick questions</b><span>Your business, your country, and your rates.</span></div></li>
      <li><Check size={20} aria-hidden /><div><b>You create your first estimate</b><span>With a sample job ready if you want to see how it works.</span></div></li>
    </ul>

    <div className="card card--pad" style={{ marginTop: 36, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Smartphone size={26} aria-hidden />
        <div>
          <b>On your phone, or can’t install?</b>
          <p className="muted">Use QuoteFlow in your browser right now. A mobile app is planned.</p>
        </div>
      </div>
      <Link to="/app" className="btn btn--secondary">Open in browser</Link>
    </div>
  </main>
);

export const PrivacyPage: React.FC = () => (
  <main className="legal">
    <h1>Privacy</h1>
    <p>QuoteFlow is built so your business stays yours. Here is exactly what happens with your data.</p>
    <h2>What stays on your device</h2>
    <ul>
      <li>Your business details, saved customers, and settings are stored on your device.</li>
      <li>In the desktop app, your estimates are saved by QuoteFlow running on your own computer.</li>
    </ul>
    <h2>When you use online mode</h2>
    <ul>
      <li>The job notes are sent to an AI service to write the estimate.</li>
      <li>Customer names, phone numbers, and addresses are removed before sending.</li>
      <li>We don’t sell your data or use it for advertising.</li>
    </ul>
    <h2>When you use “on this computer” mode</h2>
    <ul>
      <li>Job notes are processed on your computer and are not sent anywhere.</li>
    </ul>
    <h2>Voice notes</h2>
    <p>If cloud voice is available, your recording may be sent to a transcription service to turn it into text. Otherwise your browser’s built-in voice typing is used.</p>
    <h2>Web demo</h2>
    <p>The web demo stores estimates on the demo server so you can try it. Don’t enter real customer information there.</p>
    <h2>Your control</h2>
    <p>Under Settings, Privacy and data, you can download a backup or reset the device at any time.</p>
  </main>
);

export const TermsPage: React.FC = () => (
  <main className="legal">
    <h1>Terms</h1>
    <p>QuoteFlow is a side-project tool provided as is, without warranties.</p>
    <h2>Estimates are drafts</h2>
    <p>QuoteFlow uses AI to suggest line items, prices, and wording. You are responsible for reading and approving every estimate before you send it, and for the prices and commitments you make to your customers.</p>
    <h2>Local rates and suggested prices</h2>
    <p>Rates and price suggestions are guidance only and may be wrong for your area or job.</p>
    <h2>Availability</h2>
    <p>Online mode depends on third-party services and may be unavailable at times.</p>
    <h2>Your data</h2>
    <p>You own your estimates and customer information. See the Privacy page for how it is handled.</p>
  </main>
);
