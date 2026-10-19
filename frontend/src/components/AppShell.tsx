import React from 'react';
import { NavLink, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { Home, FileText, Users, Settings, Plus, Mic, X } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { isDesktop } from '../lib/platform';
import { Button } from './ui';
import { InstallPwa } from './InstallPwa';

const linkClass = ({ isActive }: { isActive: boolean }) => `nav__link ${isActive ? 'is-active' : ''}`;
const bottomClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'is-active' : '');

export const AppShell: React.FC = () => {
  const { prefs, profile, online, loading, refresh, setPrefs } = useApp();
  const loc = useLocation();

  if (isDesktop && !prefs.ai_ready) return <Navigate to="/app/preparing" replace />;
  if (!prefs.onboarded) return <Navigate to="/app/welcome" replace />;

  const showDemo = !isDesktop && !prefs.demo_banner_dismissed;
  const bizName = profile.business_name || 'Your business';

  return (
    <div className="shell">
      <aside className="nav" aria-label="Main">
        <div className="nav__brand">
          <div className="nav__mark" aria-hidden>Q</div>
          <div>
            <div className="nav__name">QuoteFlow</div>
            <div className="nav__biz">{bizName}</div>
          </div>
        </div>

        <Link to="/app/new" className="btn btn--primary nav__new" aria-label="New estimate">
          <Plus size={20} aria-hidden />
          <span>New estimate</span>
        </Link>

        <nav className="nav__list">
          <NavLink to="/app" end className={linkClass}>
            <Home size={20} aria-hidden /> <span>Home</span>
          </NavLink>
          <NavLink to="/app/estimates" className={linkClass}>
            <FileText size={20} aria-hidden /> <span>Estimates</span>
          </NavLink>
          <NavLink to="/app/clients" className={linkClass}>
            <Users size={20} aria-hidden /> <span>Clients</span>
          </NavLink>
          <NavLink to="/app/settings" className={linkClass}>
            <Settings size={20} aria-hidden /> <span>Settings</span>
          </NavLink>
        </nav>

        <div className="nav__foot" title={online ? 'Connected' : 'Server not reachable'}>
          <i className={`dot ${online ? '' : 'dot--off'}`} />
          <span>{online ? (isDesktop ? 'Running on this PC' : 'Web demo') : 'Server offline'}</span>
        </div>
      </aside>

      <div className="main">
        <InstallPwa />
        {showDemo && (
          <div className="banner" role="note">
            <div className="banner__text">
              You are using the web demo. The desktop app keeps everything on your PC and sets up the AI for you.{' '}
              <Link to="/download">Get the desktop app</Link>
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => setPrefs({ demo_banner_dismissed: true })}>
              <X size={18} />
            </button>
          </div>
        )}
        {!online && !loading && (
          <div className="banner banner--warn" role="alert">
            <div className="banner__text">
              Can’t reach the QuoteFlow server, so new estimates can’t be created right now.
            </div>
            <Button size="md" variant="secondary" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        )}
        <Outlet key={loc.pathname.split('/').slice(0, 3).join('/')} />
      </div>

      <nav className="bottom-nav" aria-label="Main">
        <NavLink to="/app" end className={bottomClass}>
          <Home size={22} aria-hidden /> Home
        </NavLink>
        <NavLink to="/app/estimates" className={bottomClass}>
          <FileText size={22} aria-hidden /> Estimates
        </NavLink>
        <NavLink to="/app/new" className={`fab ${loc.pathname === '/app/new' ? 'is-active' : ''}`} aria-label="New estimate">
          <i>
            <Mic size={24} aria-hidden />
          </i>
          New
        </NavLink>
        <NavLink to="/app/clients" className={bottomClass}>
          <Users size={22} aria-hidden /> Clients
        </NavLink>
        <NavLink to="/app/settings" className={bottomClass}>
          <Settings size={22} aria-hidden /> Settings
        </NavLink>
      </nav>
    </div>
  );
};
