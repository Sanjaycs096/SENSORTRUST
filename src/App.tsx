/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppShell } from './components/shared/AppShell.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { SubmitPage } from './pages/SubmitPage.tsx';
import { DetailsPage } from './pages/DetailsPage.tsx';
import { ReviewerQueuePage } from './pages/ReviewerQueuePage.tsx';
import { ProvenanceExplorerPage } from './pages/ProvenanceExplorerPage.tsx';
import { SpecificationPage } from './pages/SpecificationPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { sensorTrustApi } from './services/api.ts';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [flaggedCount, setFlaggedCount] = useState<number>(0);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update metrics badge
  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const m = await sensorTrustApi.getMetrics();
        setFlaggedCount(m.flaggedCount);
      } catch {
        // ignore
      }
    };
    updateMetrics();
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route matching
  const renderRoute = () => {
    if (currentPath === '/' || currentPath === '') {
      return <DashboardPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/submit') {
      return <SubmitPage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/observations/')) {
      const id = decodeURIComponent(currentPath.replace('/observations/', ''));
      return <DetailsPage observationId={id} onNavigate={handleNavigate} />;
    }

    if (currentPath === '/reviewer/queue' || currentPath === '/reviewer' || currentPath === '/reviews') {
      return <ReviewerQueuePage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/provenance') {
      return <ProvenanceExplorerPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/spec') {
      return <DashboardPage onNavigate={handleNavigate} />;
    }

    return <NotFoundPage onNavigate={handleNavigate} />;
  };

  return (
    <AppShell
      currentPath={currentPath}
      onNavigate={handleNavigate}
      flaggedCount={flaggedCount}
    >
      {renderRoute()}
    </AppShell>
  );
}
