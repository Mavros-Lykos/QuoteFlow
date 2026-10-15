import React, { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { isDesktop } from '../lib/platform';
import { COUNTRIES, TRADES, findCountry } from '../lib/countries';
import { Button, Field } from '../components/ui';

const STEPS = ['Business', 'Region', 'Rates', 'Ready'];

export const Welcome: React.FC = () => {
  const { prefs, profile, setPrefs, setProfile } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);

  const [business, setBusiness] = useState(profile.business_name);
  const [yourName, setYourName] = useState(profile.contractor_name);
  const [trade, setTrade] = useState(profile.default_trade);
  const [countryCode, setCountryCode] = useState(prefs.country);
  const country = findCountry(countryCode);
  const [taxRate, setTaxRate] = useState<string>(String(country.taxRate));
  const [hourly, setHourly] = useState<string>(String(country.hourly));
  const [markup, setMarkup] = useState<string>(String(profile.default_markup_percent));

  if (isDesktop && !prefs.ai_ready) return <Navigate to="/app/preparing" replace />;
  if (prefs.onboarded) return <Navigate to="/app" replace />;

  const pickCountry = (code: string) => {
    const c = findCountry(code);
    setCountryCode(code);
    setTaxRate(String(c.taxRate));
    setHourly(String(c.hourly));
  };

  const finish = async (goTo: string) => {
    setPrefs({
      onboarded: true,
      country: country.code,
      currency_code: country.currency,
      currency_symbol: country.symbol,
      locale: country.locale,
      tax_label: country.taxLabel,
      units: country.units,
    });
    await setProfile({
      business_name: business.trim(),
      contractor_name: yourName.trim(),
      default_trade: trade,
      currency_code: country.currency,
      currency_symbol: country.symbol,
      default_tax_percent: Number(taxRate) || 0,
      default_hourly_rate: Number(hourly) || 0,
      default_markup_percent: Number(markup) || 0,
    });
    nav(goTo, { replace: true });
  };

  const canNext = step === 0 ? business.trim().length > 1 : true;
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="welcome">
      <div className="welcome__top">
        <Link to="/" className="welcome__brand">
          <span className="nav__mark" aria-hidden>Q</span> QuoteFlow
        </Link>
        <div className="steps" role="img" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? 'is-on' : ''} />
          ))}
        </div>
      </div>

      <div className="welcome__body">
        <form
          className="welcome__card rise"
          key={step}
          onSubmit={(e) => {
            e.preventDefault();
            if (canNext && step < STEPS.length - 1) next();
          }}
        >
          {step === 0 && (
            <>
              <h1>Let’s set up your business</h1>
              <p>This goes at the top of every estimate you send. It takes about a minute.</p>
              <div className="welcome__fields">
                <Field label="Business name" htmlFor="biz">
                  <input id="biz" className="input" autoFocus value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Rivera Plumbing" autoComplete="organization" />
                </Field>
                <Field label="Your name" htmlFor="me" optional>
                  <input id="me" className="input" value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="e.g. Sam Rivera" autoComplete="name" />
                </Field>
                <Field label="Main trade" htmlFor="trade" hint="You can change this for each estimate.">
                  <select id="trade" className="select" value={trade} onChange={(e) => setTrade(e.target.value)}>
                    {TRADES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1>Where do you work?</h1>
              <p>We use this for your currency, tax name, and local labor rates.</p>
              <div className="welcome__fields">
                <Field label="Country" htmlFor="country">
                  <select id="country" className="select" autoFocus value={countryCode} onChange={(e) => pickCountry(e.target.value)}>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="region-summary" aria-label="Region defaults">
                  <div>
                    Currency<b>{country.currency} ({country.symbol})</b>
                  </div>
                  <div>
                    Tax name<b>{country.taxLabel}</b>
                  </div>
                  <div>
                    Measurements<b>{country.units === 'imperial' ? 'Feet, inches' : 'Metres'}</b>
                  </div>
                </div>
                <Field label={`${country.taxLabel} rate`} htmlFor="tax" hint="Added to every estimate. Set 0 if you don’t charge it.">
                  <div className="input-affix input-affix--post">
                    <input id="tax" className="input num" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                    <span className="input-affix__pre">%</span>
                  </div>
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1>What do you charge?</h1>
              <p>These are starting points. Every estimate lets you adjust the margin.</p>
              <div className="welcome__fields">
                <Field label="Hourly labor rate" htmlFor="hourly">
                  <div className="input-affix">
                    <span className="input-affix__pre">{country.symbol}</span>
                    <input id="hourly" className="input num" autoFocus inputMode="decimal" value={hourly} onChange={(e) => setHourly(e.target.value)} />
                  </div>
                </Field>
                <Field label="Materials markup" htmlFor="markup" hint="Added on top of what you pay for materials.">
                  <div className="input-affix input-affix--post">
                    <input id="markup" className="input num" inputMode="decimal" value={markup} onChange={(e) => setMarkup(e.target.value)} />
                    <span className="input-affix__pre">%</span>
                  </div>
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1>You’re ready, {yourName.trim().split(' ')[0] || business.trim()}</h1>
              <p>Here is what QuoteFlow will do for you.</p>
              <ul className="ready-list">
                <li>
                  <CheckCircle2 size={20} aria-hidden />
                  <span>
                    <b>Turn job notes into an estimate.</b> Talk or type; you get line items, a total, and a cover letter.
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={20} aria-hidden />
                  <span>
                    <b>Price in {country.currency} with {country.taxLabel}</b> at {taxRate || 0}%.
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={20} aria-hidden />
                  <span>
                    <b>Keep your clients and estimates private.</b> Your business details stay on this device.
                  </span>
                </li>
              </ul>
            </>
          )}

          <div className="welcome__actions">
            {step > 0 ? (
              <Button variant="ghost" onClick={back}>
                <ArrowLeft size={18} aria-hidden /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="primary" size="lg" type="submit" disabled={!canNext}>
                Continue <ArrowRight size={18} aria-hidden />
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 10, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button variant="ghost" onClick={() => void finish('/app')}>
                  Go to home
                </Button>
                <Button variant="primary" size="lg" onClick={() => void finish('/app/new?sample=1')}>
                  Create my first estimate
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
