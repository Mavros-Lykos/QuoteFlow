import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Plus, Check, ChevronRight, FileText } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { formatDate, greeting, initials } from '../lib/format';
import { EmptyState, StatusPill } from '../components/ui';

export const Home: React.FC = () => {
  const { profile, quotes, stats, money, prefs } = useApp();
  const nav = useNavigate();
  const first = profile.contractor_name.trim().split(' ')[0];

  const todos = [
    { id: 'first', done: quotes.length > 0, title: 'Create your first estimate', sub: 'Talk through a job and see the result', to: '/app/new?sample=1' },
    { id: 'license', done: profile.license_number.trim().length > 0, title: 'Add your license number', sub: 'Shows on every estimate', to: '/app/settings/business' },
    { id: 'phone', done: profile.phone.trim().length > 0, title: 'Add a phone number', sub: 'So customers can reach you', to: '/app/settings/business' },
    { id: 'terms', done: profile.terms_template.trim().length > 0, title: 'Check your payment terms', sub: 'Deposit and balance wording', to: '/app/settings/pricing' },
  ];
  const pending = todos.filter((t) => !t.done);

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <h1>
            {greeting()}
            {first ? `, ${first}` : ''}
          </h1>
          <p>{profile.business_name}</p>
        </div>
      </header>

      <section className="hero-cta rise" aria-label="Start an estimate">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>What’s the job today?</h2>
          <p>Say it out loud or type it. We’ll turn it into a priced estimate you can send.</p>
        </div>
        <div className="hero-cta__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => nav('/app/new?voice=1')}>
            <Mic size={20} aria-hidden /> Talk it through
          </button>
          <Link to="/app/new" className="btn btn--secondary btn--lg">
            <Plus size={20} aria-hidden /> Type it
          </Link>
        </div>
      </section>

      {stats.count > 0 && (
        <div className="summary-line" aria-label="Summary">
          <div>
            <b className="num">{money(stats.quoted, true)}</b>
            <span>quoted</span>
          </div>
          <div>
            <b className="num">{stats.count}</b>
            <span>{stats.count === 1 ? 'estimate' : 'estimates'}</span>
          </div>
          <div>
            <b className="num">{stats.winRate === null ? '—' : `${stats.winRate}%`}</b>
            <span>won</span>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div className="section-title">
            <h2>Finish setting up</h2>
            <span className="muted">{todos.length - pending.length} of {todos.length} done</span>
          </div>
          <div className="card checklist">
            {todos.map((t) => (
              <button key={t.id} type="button" className={`check ${t.done ? 'is-done' : ''}`} onClick={() => nav(t.to)}>
                <span className="check__box">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="check__title">{t.title}</span>
                  <br />
                  <span className="check__sub">{t.sub}</span>
                </span>
                {!t.done && <ChevronRight size={18} className="row__chev" aria-hidden />}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        <h2>Recent estimates</h2>
        {quotes.length > 3 && (
          <Link to="/app/estimates" className="link">
            See all
          </Link>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText size={28} />}
            title="No estimates yet"
            text="Your first one takes about a minute. Try describing a job you did recently."
          />
        </div>
      ) : (
        <div className="card rows">
          {quotes.slice(0, 3).map((q) => (
            <button key={q.id} type="button" className="row" onClick={() => nav(`/app/estimates/${q.id}`)}>
              <span className="row__avatar" aria-hidden>{initials(q.client.name)}</span>
              <span className="row__main">
                <span className="row__title">
                  <span className="t">{q.project_title}</span>
                </span>
                <span className="row__sub" style={{ display: 'block' }}>
                  {q.client.name} · {formatDate(q.created_at, prefs.locale)}
                </span>
              </span>
              <span className="row__end">
                <span className="row__amount num" style={{ display: 'block' }}>{money(q.total_amount)}</span>
                <StatusPill status={q.status} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
