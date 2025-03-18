import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useGlobalState, Splash } from './GlobalStateContext';
import '../styles/Constructor.css';
import { emit } from '@tauri-apps/api/event';

function SplashElement({ splash, reloadChapterData }: { splash: Splash, reloadChapterData: () => void }) {
  const { chapterId } = useGlobalState(); // Access global chapterId
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isSelected, setSelected] = useState(false);
  let filename = splash.image;

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setMenuPosition({ x: event.pageX, y: event.pageY });
    setMenuVisible(true);
  };

  const hideContextMenu = () => setMenuVisible(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close the context menu if the event is a left-click (button === 0) or right-click (button === 2)
      if (event.button === 0 || event.button === 2) {
        hideContextMenu();
      }
    };
  
    if (menuVisible) {
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      setTimeout(() => document.addEventListener('contextmenu', handleClickOutside), 0); // Right-click detection
    }
  
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [menuVisible]);

  const handleRemove = () => {
    invoke('remove_splash', { chapterId, filename })
      .then(() => {
        if (isSelected) { emit('splashUnselected', splash); }
        reloadChapterData()
    })
      .catch(error => console.error(error));
  };

  const handleAllegiance = () => {
    invoke('change_splash_allegiance', { chapterId, filename })
      .then(() => reloadChapterData())
      .catch(error => console.error(error));
  };

  const handleClick = () => {
    if (!isSelected) {
      emit('splashSelected', splash);
      console.log('selected');
      setSelected(true);
    } else {
      emit('splashUnselected', splash);
      console.log('unselected');
      setSelected(false);
    }
  };

  return (
    <>
      <div className="element-item splash" onContextMenu={handleContextMenu}>
        <img 
          src={`../tableau/assets/splashes/${filename}`} 
          alt={filename} 
          onClick={handleClick}
          style={{ 
            borderBottom: splash.allegiance === 'neutral' ? '2px solid white' : '2px solid red' 
          }} />
      </div>
      {menuVisible && (
        <ul className="context-menu" style={{ top: `${menuPosition.y - 40}px`, left: `${menuPosition.x}px` }}>
          <p onClick={handleRemove}>Remove</p>
          <p onClick={handleAllegiance}>Allegiance</p>
        </ul>
      )}
    </>    
  );
}

export default SplashElement;
