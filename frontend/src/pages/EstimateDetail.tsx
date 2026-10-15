import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, CheckCircle2, Copy, Download, FileText, Mail, MoreHorizontal, Printer, RotateCcw, Send, ShieldCheck, Volume2, XCircle,
} from 'lucide-react';
import { useApp } from '../lib/app-context';
import { formatDate } from '../lib/format';
import { API_BASE } from '../lib/platform';
import { speak } from '../lib/speak';
import { Button, EmptyState, Segmented, Sheet, StatusPill, useToast } from '../components/ui';

type View = 'summary' | 'items' | 'notes' | 'print';

export const EstimateDetail: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { quotes, profile, prefs, money, setStatus, loading } = useApp();
  const quote = quotes.find((q) => q.id === id);

  const [view, setView] = useState<View>('summary');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!quote) {
    return (
      <div className="card">
        {loading ? (
          <div className="empty"><p>Loading…</p></div>
        ) : (
          <EmptyState
            icon={<FileText size={28} />}
            title="Estimate not found"
            text="It may have been removed, or the server isn’t reachable."
            action={<Link to="/app/estimates" className="btn btn--secondary">Back to estimates</Link>}
          />
        )}
      </div>
    );
  }

  const q = quote;
  const status = q.status === 'approved' || q.status === 'sent' || q.status === 'lost' ? q.status : 'draft';
  const progressIndex = status === 'draft' ? 0 : status === 'sent' ? 1 : 2;
  const firstName = q.client.name.split(' ')[0];
  const biz = profile.business_name || 'our team';

  const message = `Hi ${firstName}, here is your estimate for “${q.project_title}” from ${biz}.\n\nTotal: ${money(q.total_amount)} (includes ${prefs.tax_label} ${q.tax_percent}%).\n\n${profile.terms_template}\n\nReply here if you have questions or want to go ahead.`;

  const change = async (next: 'draft' | 'sent' | 'approved' | 'lost') => {
    try {
      await setStatus(q.id, next);
      if (next === 'approved') {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#d9480f', '#1e7b4f', '#17202a'] });
        toast('success', 'Marked as won');
      } else if (next === 'sent') toast('success', 'Marked as sent');
      else if (next === 'lost') toast('success', 'Marked as lost');
      else toast('success', 'Reopened as draft');
    } catch {
      toast('error', 'Couldn’t update the status. Try again.');
    }
  };

  const pdf = () => window.open(`${API_BASE}/quotes/${q.id}/pdf`, '_blank');
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast('success', 'Message copied. Paste it into a text or WhatsApp.');
    } catch {
      toast('error', 'Couldn’t copy. Select the text and copy it manually.');
    }
  };
  const emailIt = () => {
    const subject = encodeURIComponent(`Estimate: ${q.project_title}`);
    window.location.href = `mailto:${encodeURIComponent(q.client.email || '')}?subject=${subject}&body=${encodeURIComponent(message)}`;
  };
  const print = () => {
    setView('print');
    window.setTimeout(() => {
      window.print();
      setView('summary');
    }, 80);
  };
  const listen = () => {
    setMenuOpen(false);
    setSpeaking(true);
    void speak(q.client_proposal_prose, () => setSpeaking(false));
  };

  const showSummary = view === 'summary' || view === 'print';
  const showItems = view === 'items' || view === 'print';

  return (
    <article className="card est rise" aria-label={q.project_title}>
      <button type="button" className="back only-narrow no-print" onClick={() => nav('/app/estimates')}>
        <ArrowLeft size={16} aria-hidden /> All estimates
      </button>

      <div className="est__top">
        <div style={{ minWidth: 0 }}>
          <div className="est__client">{q.client.name}</div>
          <h2 className="est__title">{q.project_title}</h2>
          <div className="est__meta">
            <StatusPill status={status} />
            <span>#{q.quote_number}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(q.created_at, prefs.locale)}</span>
          </div>
        </div>

        <div className="menu-wrap no-print" ref={menuRef}>
          <button type="button" className="icon-btn" aria-label="More actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <MoreHorizontal size={22} />
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); pdf(); }}>
                <Download size={18} aria-hidden /> Download PDF
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); print(); }}>
                <Printer size={18} aria-hidden /> Print
              </button>
              <button type="button" role="menuitem" onClick={listen} disabled={speaking}>
                <Volume2 size={18} aria-hidden /> {speaking ? 'Playing…' : 'Listen to the letter'}
              </button>
              {(status === 'draft' || status === 'sent') && (
                <>
                  <hr />
                  <button type="button" role="menuitem" className="danger" onClick={() => { setMenuOpen(false); void change('lost'); }}>
                    <XCircle size={18} aria-hidden /> Mark as lost
                  </button>
                </>
              )}
              {status !== 'draft' && (
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void change('draft'); }}>
                  <RotateCcw size={18} aria-hidden /> Reopen as draft
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="est__total">
        <b className="num">{money(q.total_amount)}</b>
        <span>incl. {prefs.tax_label} {q.tax_percent}%</span>
      </div>

      <div className="progress" aria-label={`Status: ${status}`}>
        <div className={`progress__step ${progressIndex >= 0 ? 'is-on' : ''}`}><i />Draft</div>
        <div className={`progress__step ${progressIndex >= 1 ? 'is-on' : ''}`}><i />Sent</div>
        <div className={`progress__step ${progressIndex >= 2 ? 'is-on' : ''} ${status === 'lost' ? 'is-lost' : 'is-won'}`}><i />{status === 'lost' ? 'Lost' : 'Won'}</div>
      </div>

      <div className="est__actions no-print">
        {status === 'draft' && (
          <Button variant="primary" size="lg" onClick={() => setSendOpen(true)}>
            <Send size={18} aria-hidden /> Send to customer
          </Button>
        )}
        {status === 'sent' && (
          <>
            <Button variant="primary" size="lg" onClick={() => void change('approved')}>
              <CheckCircle2 size={18} aria-hidden /> They said yes
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setSendOpen(true)}>
              Send again
            </Button>
          </>
        )}
        {status === 'approved' && (
          <Button variant="secondary" size="lg" onClick={pdf}>
            <Download size={18} aria-hidden /> Download PDF
          </Button>
        )}
        {status === 'lost' && (
          <Button variant="secondary" size="lg" onClick={() => void change('draft')}>
            <RotateCcw size={18} aria-hidden /> Reopen as draft
          </Button>
        )}
      </div>

      <div className="est__tabs no-print">
        <Segmented<Exclude<View, 'print'>>
          label="Estimate sections"
          value={view === 'print' ? 'summary' : view}
          onChange={setView}
          options={[
            { value: 'summary', label: 'Summary' },
            { value: 'items', label: `Line items (${q.line_items.length})` },
            { value: 'notes', label: 'Pricing notes' },
          ]}
        />
      </div>

      {showSummary && (
        <section aria-label="Summary">
          <div className="letter">{q.client_proposal_prose}</div>

          <div className="totals num">
            <div><span>Materials and equipment</span><span>{money(q.subtotal_materials)}</span></div>
            <div><span>Labor</span><span>{money(q.subtotal_labor)}</span></div>
            {q.permits_and_fees > 0 && <div><span>Permits and fees</span><span>{money(q.permits_and_fees)}</span></div>}
            <div><span>{prefs.tax_label} ({q.tax_percent}%)</span><span>{money(q.tax_amount)}</span></div>
            <div className="grand"><span>Total</span><b>{money(q.total_amount)}</b></div>
          </div>

          <hr className="divider" />
          <div className="party">
            <div>
              <h4>Prepared for</h4>
              <p><b>{q.client.name}</b></p>
              {q.client.address && <p>{q.client.address}</p>}
              {(q.client.phone || q.client.email) && <p>{[q.client.phone, q.client.email].filter(Boolean).join(' · ')}</p>}
            </div>
            <div>
              <h4>From</h4>
              <p><b>{profile.business_name}</b></p>
              {profile.contractor_name && <p>{profile.contractor_name}</p>}
              {profile.license_number && <p>{profile.license_number}</p>}
            </div>
          </div>
          <p className="muted" style={{ marginTop: 18, fontSize: '0.8125rem' }}>{q.terms_and_conditions}</p>
        </section>
      )}

      {showItems && (
        <section aria-label="Line items" style={{ marginTop: view === 'print' ? 28 : 0 }}>
          <table className="items">
            <thead>
              <tr>
                <th>Item</th>
                <th className="r">Qty</th>
                <th className="r">Rate</th>
                <th className="r">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.line_items.map((it, i) => (
                <tr key={it.id ?? i}>
                  <td>
                    <span className="cat">{it.category}</span>
                    <br />
                    {it.description}
                  </td>
                  <td className="r num" data-l="Qty">{it.quantity} {it.unit}</td>
                  <td className="r num" data-l="Rate">{money(it.unit_cost)}</td>
                  <td className="r num total">{money(it.quantity * it.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === 'notes' && (
        <section className="notes-grid" aria-label="Pricing notes">
          {q.tabpfn_prediction && (
            <div className="note">
              <h4>Similar jobs usually come in around</h4>
              <b className="num">{money(q.tabpfn_prediction.suggested_price)}</b>
              <p>
                Typical range {money(q.tabpfn_prediction.recommended_range_min, true)} to {money(q.tabpfn_prediction.recommended_range_max, true)}.{' '}
                {q.tabpfn_prediction.rationale}
              </p>
            </div>
          )}
          {q.market_benchmark && (
            <div className="note">
              <h4>Local labor rate{q.market_benchmark.region_zip ? ` near ${q.market_benchmark.region_zip}` : ''}</h4>
              <b className="num">{money(q.market_benchmark.avg_hourly_rate)} / hour</b>
              <p>
                Area range {money(q.market_benchmark.low_hourly_rate, true)} to {money(q.market_benchmark.high_hourly_rate, true)} per hour. Source: {q.market_benchmark.source}.
              </p>
            </div>
          )}
          <div className="note">
            <h4>Follow-up</h4>
            <p>If you mark this as sent and hear nothing, we’ll remind you to check in after about 3 days.</p>
          </div>
          <div className="note">
            <h4>How this was made</h4>
            <p style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <ShieldCheck size={16} aria-hidden style={{ marginTop: 3, flexShrink: 0 }} />
              <span>
                {q.llm_provider === 'ollama' ? 'Written on this computer.' : 'Written online with customer details removed.'} Always read it before you send it.
              </span>
            </p>
          </div>
        </section>
      )}

      <Sheet
        open={sendOpen}
        title="Send to customer"
        onClose={() => setSendOpen(false)}
        footer={
          status === 'draft' ? (
            <Button variant="primary" onClick={() => { setSendOpen(false); void change('sent'); }}>
              I’ve sent it
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setSendOpen(false)}>Done</Button>
          )
        }
      >
        <button type="button" className="send-option" onClick={() => void copyMessage()}>
          <span className="ic"><Copy size={20} aria-hidden /></span>
          <span><b>Copy a text message</b><span className="s">For SMS or WhatsApp</span></span>
        </button>
        <button type="button" className="send-option" onClick={emailIt}>
          <span className="ic"><Mail size={20} aria-hidden /></span>
          <span><b>Write an email</b><span className="s">{q.client.email ? `To ${q.client.email}` : 'Opens your email app'}</span></span>
        </button>
        <button type="button" className="send-option" onClick={pdf}>
          <span className="ic"><Download size={20} aria-hidden /></span>
          <span><b>Download the PDF</b><span className="s">Attach it to anything</span></span>
        </button>
        <div>
          <div className="field__label" style={{ marginBottom: 6 }}>Message preview</div>
          <div className="preview-msg">{message}</div>
        </div>
      </Sheet>
    </article>
  );
};
