import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import LandscapeElement from './LandscapeElement';
import SplashElement from './SplashElement';
import CombatElement from './CombatElement';
import { useGlobalState, useOpenDisplayWindow } from './GlobalStateContext';
import '../styles/components/CampaignConstructor.css';

function CampaignConstructor() {
  const navigate = useNavigate();
  const openDisplayWindow = useOpenDisplayWindow();
  const { chapterId, chapterData, reloadChapterData } = useGlobalState(); // Access global state including chapterId
  const [isNarrowWidth, setIsNarrowWidth] = useState(window.innerWidth <= 600);

  useEffect(() => {
    reloadChapterData(); // Load chapter data when the component mounts
  }, []);

  // Handle window resize to detect narrow width
  useEffect(() => {
    const handleResize = () => {
      setIsNarrowWidth(window.innerWidth <= 600);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBackClick = () => {
    handleClearSelections(); // Clear display window content when leaving
    navigate(`/`);
  };

  const handleAddLandscape = () => {
    if (!chapterId) return; // Make sure chapterId is available
    invoke('upload_landscapes', { chapterId }) // Pass chapterId
      .then(() => reloadChapterData())
      .catch(error => console.error('Error uploading landscapes:', error));
  };

  const handleAddSplash = () => {
    if (!chapterId) return; // Make sure chapterId is available
    invoke('upload_splashes', { chapterId }) // Pass chapterId
      .then(() => reloadChapterData())
      .catch(error => console.error('Error uploading splashes:', error));
  };

  const handleAddCombat = () => {
    if (!chapterId) return; // Make sure chapterId is available
    invoke('create_combat', { chapterId }) // Pass chapterId
      .then(() => reloadChapterData())
      .catch(error => console.error('Error creating combat:', error));
  };

  const handleShowDisplay = () => {
    openDisplayWindow(`campaign-display`);
  }

  const handleClearSelections = () => {
    emit('landscapeUnselected');
    emit('clearAllSplashes');
  }

  return (
    <div className="constructor-container campaign-constructor">
      <div className="nav-bar">
        <div className="back-button-container">
          <div className="back-button" onClick={handleBackClick}>
            <img src="/assets/back.svg" alt="Back" className="back-icon" />
          </div>
        </div>
        {!isNarrowWidth && <div className="header-container">Campaign Constructor: Chapter {chapterId}</div>}
        <div className="show-display-container">
            <div className="show-display" onClick={handleShowDisplay}>Show Display</div>
            <div className="clear-selections" onClick={handleClearSelections}>Clear</div>
        </div>
      </div>

      <div className="elements">
        <div className="landscapes">
          {chapterData.landscapes.sort((a, b) => a.localeCompare(b)).map((landscape, index) => (
            <div className="" key={index}>
              <LandscapeElement filename={landscape} reloadChapterData={reloadChapterData} />
            </div>
          ))}
          <div className="element-item add" onClick={handleAddLandscape}>
            <div className="add-element-container">
              <img src="/assets/plus.svg" alt="Add plus icon" className="plus-icon" />
              <p>Add Landscape</p>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="splashes">
          {chapterData.splashes.sort((a, b) => a.image.localeCompare(b.image)).map((splash, index) => (
            <div className="" key={index}>
              <SplashElement splash={splash} reloadChapterData={reloadChapterData} />
            </div>
          ))}
          <div className="element-item splash" onClick={handleAddSplash}>
            <div className="add-element-container">
              <img src="/assets/plus.svg" alt="Add plus icon" className="plus-icon" />
              <p>Add Splash</p>
            </div>
          </div>
        </div>
      </div>

      <div className="combatbox">
        {chapterData.combat.map((battle, index) => (
          <div className="" key={index}>
            <CombatElement filename={battle.battlemap} reloadChapterData={reloadChapterData} />
          </div>
        ))}
        <div className="element-item landscape" onClick={handleAddCombat}>
            <div className="add-element-container">
              <img src="/assets/plus.svg" alt="Add plus icon" className="plus-icon" />
              <p>Add Combat</p>
            </div>
          </div>
      </div>
    </div>
  );
}

export default CampaignConstructor;
