import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import LandscapeElement from './LandscapeElement';
import SplashElement from './SplashElement';
import CombatElement from './CombatElement';
import { useGlobalState, useOpenDisplayWindow } from './GlobalStateContext';
import '../styles/Constructor.css';

function CampaignConstructor() {
  const navigate = useNavigate();
  const openDisplayWindow = useOpenDisplayWindow();
  const { chapterId, chapterData, reloadChapterData } = useGlobalState(); // Access global state including chapterId

  useEffect(() => {
    reloadChapterData(); // Load chapter data when the component mounts
  }, []);

  const handleBackClick = () => navigate(`/`);

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

  return (
    <div className="constructor-container">
      <div className="nav-bar">
        <div className="back-button-container">
          <div className="back-button" onClick={handleBackClick}>
            <img src="/assets/back.svg" alt="Back" className="back-icon" />
          </div>
        </div>
        <div className="header-container">Campaign Constructor: Chapter {chapterId}</div>
        <div className="show-display-container">
            <div className="show-display" onClick={handleShowDisplay}>Show Display</div>
        </div>
      </div>

      <div className="elements">
        <div className="landscapes">
          {chapterData.landscapes.map((landscape, index) => (
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
          {chapterData.splashes.map((splash, index) => (
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
