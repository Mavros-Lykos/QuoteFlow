import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Search, Users } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { initials } from '../lib/format';
import { Button, EmptyState, Field, PageHeader, Sheet, useToast } from '../components/ui';
import type { SavedClient } from '../types';

export const Clients: React.FC = () => {
  const { clients, quotes, addClient, money, prefs } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<SavedClient | null>(null);
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', zip_code: '' });

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return clients.filter((c) => !n || `${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(n));
  }, [clients, q]);

  const statsFor = (c: SavedClient) => {
    const mine = quotes.filter((x) => x.client.name.trim().toLowerCase() === c.name.trim().toLowerCase());
    return { count: mine.length, total: mine.reduce((s, x) => s + x.total_amount, 0) };
  };

  const save = () => {
    if (!f.name.trim()) return;
    addClient({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), address: f.address.trim(), zip_code: f.zip_code.trim() });
    setAdding(false);
    setF({ name: '', phone: '', email: '', address: '', zip_code: '' });
    toast('success', 'Customer saved');
  };

  const zipLabel = prefs.country === 'US' ? 'ZIP code' : 'Postal code';

  return (
    <div className="page">
      <PageHeader
        title="Clients"
        subtitle="People you’ve quoted. Pick them again in one tap."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden /> Add customer
          </Button>
        }
      />

      {clients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users size={28} />}
            title="No customers yet"
            text="They’re saved automatically when you create an estimate, or you can add one now."
            action={<Button variant="primary" onClick={() => setAdding(true)}>Add customer</Button>}
          />
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="search">
              <Search size={18} aria-hidden />
              <input className="input" type="search" placeholder="Search clients" aria-label="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="card rows">
            {list.map((c) => {
              const s = statsFor(c);
              return (
                <button key={c.id} type="button" className="row" onClick={() => setOpen(c)}>
                  <span className="row__avatar" aria-hidden>{initials(c.name)}</span>
                  <span className="row__main">
                    <span className="row__title"><span className="t">{c.name}</span></span>
                    <span className="row__sub" style={{ display: 'block' }}>{[c.phone, c.address].filter(Boolean).join(' · ') || 'No contact details'}</span>
                  </span>
                  <span className="row__end muted" style={{ fontSize: '0.8125rem' }}>
                    {s.count} {s.count === 1 ? 'estimate' : 'estimates'}
                  </span>
                  <ChevronRight size={18} className="row__chev" aria-hidden />
                </button>
              );
            })}
          </div>
        </>
      )}

      <Sheet
        open={adding}
        title="Add customer"
        onClose={() => setAdding(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" disabled={!f.name.trim()} onClick={save}>Save customer</Button>
          </>
        }
      >
        <Field label="Name" htmlFor="n"><input id="n" className="input" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="p" optional><input id="p" className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email" htmlFor="e" optional><input id="e" className="input" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Address" htmlFor="a" optional><input id="a" className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Field label={zipLabel} htmlFor="z" optional><input id="z" className="input" value={f.zip_code} onChange={(e) => setF({ ...f, zip_code: e.target.value })} /></Field>
      </Sheet>

      <Sheet
        open={open !== null}
        title={open?.name ?? ''}
        onClose={() => setOpen(null)}
        footer={
          open && (
            <Button variant="primary" onClick={() => nav(`/app/new?client=${open.id}`)}>
              New estimate for {open.name.split(' ')[0]}
            </Button>
          )
        }
      >
        {open && (
          <>
            <dl className="recap">
              <div><dt>Phone</dt><dd>{open.phone || '—'}</dd></div>
              <div><dt>Email</dt><dd>{open.email || '—'}</dd></div>
              <div><dt>Address</dt><dd>{open.address || '—'}</dd></div>
              <div><dt>Quoted so far</dt><dd className="num">{money(statsFor(open).total)}</dd></div>
            </dl>
          </>
        )}
      </Sheet>
    </div>
  );
};
