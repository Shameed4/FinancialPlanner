'use client';

import { AnimatePresence } from 'framer-motion';
import { usePage } from './context/PageContext';
import ScenarioPage from './components/pages/ScenarioPage';
import HomePage from './components/pages/HomePage';
import SimulationPage from './components/pages/SimulationPage';
import AccountPage from './components/pages/AccountPage';

export default function Home() {
  const { activePage } = usePage();

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage />;
      case 'scenario':
        return <ScenarioPage />;
      case 'simulation':
        return <SimulationPage />;
      case 'account':
        return <AccountPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {renderPage()}
    </AnimatePresence>
  );
}
