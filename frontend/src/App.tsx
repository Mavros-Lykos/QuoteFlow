import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './lib/app-context';
import { ToastProvider } from './components/ui';
import { AppShell } from './components/AppShell';
import { Landing, SiteLayout, DownloadPage, PrivacyPage, TermsPage } from './pages/Site';
import { Welcome } from './pages/Welcome';
import { Preparing } from './pages/Preparing';
import { Home } from './pages/Home';
import { NewEstimate } from './pages/NewEstimate';
import { Estimates } from './pages/Estimates';
import { EstimateDetail } from './pages/EstimateDetail';
import { Clients } from './pages/Clients';
import { Settings } from './pages/Settings';
import { isDesktop } from './lib/platform';

const ScrollManager: React.FC = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

export const App: React.FC = () => (
  <AppProvider>
    <ToastProvider>
      <ScrollManager />
      <Routes>
        {/* The desktop app skips the marketing site and opens straight into the product. */}
        <Route path="/" element={isDesktop ? <Navigate to="/app" replace /> : <SiteLayout />}>
          <Route index element={<Landing />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
        </Route>

        <Route path="/app/preparing" element={<Preparing />} />
        <Route path="/app/welcome" element={<Welcome />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="new" element={<NewEstimate />} />
          <Route path="estimates" element={<Estimates />}>
            <Route path=":id" element={<EstimateDetail />} />
          </Route>
          <Route path="clients" element={<Clients />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/:section" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  </AppProvider>
);

export default App;
