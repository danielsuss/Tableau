import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useGlobalState, useUpdateBattlemapId } from './GlobalStateContext';
import '../styles/Constructor.css';

function CombatElement({ filename, reloadChapterData }: { filename: string, reloadChapterData: () => void }) {
  const { chapterId } = useGlobalState(); // Access global chapterId
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const updateBattlemapId = useUpdateBattlemapId();

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    console.log('contextmenu');
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
    invoke('remove_combat', { chapterId, battlemap: filename })
      .then(() => reloadChapterData())
      .catch(error => console.error(error));
  };

  const handleClick = () => {
    updateBattlemapId(filename);
    reloadChapterData();
    navigate(`/combat-constructor/${filename}`);
  };

  return (
    <>
      <div className="element-item landscape" onClick={handleClick} onContextMenu={handleContextMenu}>
        <img src={`../tableau/assets/battlemaps/${filename}`} alt={filename} />
      </div>
      {menuVisible && (
        <ul className="context-menu" style={{ top: `${menuPosition.y - 40}px`, left: `${menuPosition.x}px` }}>
          <p onClick={handleRemove}>Remove</p>
        </ul>
      )}
    </>
  );
}

export default CombatElement;
