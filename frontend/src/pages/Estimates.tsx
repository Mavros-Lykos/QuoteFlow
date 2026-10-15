import React, { useMemo, useState } from 'react';
import { Outlet, useMatch, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, FileText, Plus, Search } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { formatDate, initials } from '../lib/format';
import { EmptyState, Segmented, StatusPill } from '../components/ui';

type Filter = 'all' | 'draft' | 'sent' | 'approved' | 'lost';

export const Estimates: React.FC = () => {
  const { quotes, money, prefs, loading } = useApp();
  const nav = useNavigate();
  const match = useMatch('/app/estimates/:id');
  const activeId = match?.params.id;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return quotes.filter((x) => {
      if (filter !== 'all' && x.status !== filter) return false;
      if (!needle) return true;
      return `${x.project_title} ${x.client.name} ${x.quote_number}`.toLowerCase().includes(needle);
    });
  }, [quotes, q, filter]);

  return (
    <div className="page page--wide">
      <header className="page-head" style={{ marginBottom: 20 }}>
        <div className="page-head__text">
          <h1>Estimates</h1>
        </div>
        <div className="page-head__actions">
          <Link to="/app/new" className="btn btn--primary">
            <Plus size={18} aria-hidden /> New estimate
          </Link>
        </div>
      </header>

      <div className={`split ${activeId ? 'has-detail' : ''}`}>
        <aside className="split__list" aria-label="Estimate list">
          <div className="toolbar">
            <div className="search">
              <Search size={18} aria-hidden />
              <input className="input" type="search" placeholder="Search estimates" aria-label="Search estimates" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Segmented
              label="Filter by status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'approved', label: 'Won' },
                { value: 'lost', label: 'Lost' },
              ]}
            />
          </div>

          {quotes.length === 0 && !loading ? (
            <div className="card">
              <EmptyState
                icon={<FileText size={28} />}
                title="No estimates yet"
                text="Create one and it shows up here."
                action={
                  <Link to="/app/new" className="btn btn--primary">
                    New estimate
                  </Link>
                }
              />
            </div>
          ) : list.length === 0 ? (
            <p className="muted" style={{ padding: '24px 4px' }}>Nothing matches. Try a different search or filter.</p>
          ) : (
            <div className="card rows">
              {list.map((x) => (
                <button key={x.id} type="button" className={`row ${activeId === x.id ? 'is-active' : ''}`} onClick={() => nav(`/app/estimates/${x.id}`)}>
                  <span className="row__avatar" aria-hidden>{initials(x.client.name)}</span>
                  <span className="row__main">
                    <span className="row__title">
                      <span className="t">{x.project_title}</span>
                    </span>
                    <span className="row__sub" style={{ display: 'block' }}>
                      {x.client.name} · {formatDate(x.created_at, prefs.locale)}
                    </span>
                  </span>
                  <span className="row__end">
                    <span className="row__amount num" style={{ display: 'block' }}>{money(x.total_amount)}</span>
                    <StatusPill status={x.status} />
                  </span>
                  <ChevronRight size={18} className="row__chev" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </aside>

        {activeId ? (
          <Outlet />
        ) : (
          <div className="split__empty">
            <div>
              <FileText size={32} aria-hidden style={{ margin: '0 auto 10px' }} />
              <p>Select an estimate to see it here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
