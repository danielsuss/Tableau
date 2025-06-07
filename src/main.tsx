import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ChapterSelect from './components/ChapterSelect';
import CampaignConstructor from './components/CampaignConstructor'; // Import CampaignConstructor
import CombatConstructor from './components/CombatContructor';
import { GlobalStateProvider } from './components/GlobalStateContext'; // Import GlobalStateProvider
import './styles/index.css';
import './styles/shared/layout.css';
import './styles/shared/forms.css';
import CombatDisplay from './components/CombatDisplay';
import CampaignDisplay from './components/CampaignDisplay';

/*
  main.tsx
  - Entry point of the app using HashRouter for routing.
  - Handles ChapterSelect and CampaignConstructor routes.
*/

// Component that disables the context menu globally
const App = () => {
  useEffect(() => {
    const disableContextMenu = (event: MouseEvent) => {
      event.preventDefault(); // Prevents the default context menu from appearing
    };

    // Add the event listener when the component mounts
    document.addEventListener('contextmenu', disableContextMenu);

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
    };
  }, []); // Empty dependency array means this runs once on mount and cleanups on unmount

  return (
    <GlobalStateProvider> {/* Wrap the app with GlobalStateProvider */}
      <Router>
        <Routes>
          <Route path="/" element={<ChapterSelect />} />
          <Route path="/campaign-constructor" element={<CampaignConstructor />} />
          <Route path="/combat-constructor/:battlemap" element={<CombatConstructor />} />
          <Route path="/combat-display/:chapterid/:battlemapid" element={<CombatDisplay />} />
          <Route path="/campaign-display" element={<CampaignDisplay />} />
          {/* Catch-all route for 404 */}
          <Route path="*" element={<a href='/'>404: Page Not Found</a>} />
        </Routes>
      </Router>
    </GlobalStateProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
