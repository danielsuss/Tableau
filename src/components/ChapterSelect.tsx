import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useGlobalState } from './GlobalStateContext';
import '../styles/components/ChapterSelect.css';

function ChapterSelect() {
  const navigate = useNavigate();
  const { setChapterId, reloadChapterData } = useGlobalState(); // Global state hooks
  const [chapters, setChapters] = useState<string[]>([]);
  const [newChapterVisible, setNewChapterVisible] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [contextChapter, setContextChapter] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const getChapters = () => {
    invoke<string[]>('get_chapters')
      .then((response: string[]) => {
        setChapters(response);
      })
      .catch((error: string) => {
        console.error('Failed to fetch chapters:', error);
      });
  }

  useEffect(() => {
    getChapters();
  }, []);

  const handleChapterClick = (chapter: string) => {
    const id = chapter.split(' ')[1];
    setChapterId(id); // Set global chapterId
    reloadChapterData(); // Reload global chapterData
    navigate(`/campaign-constructor`); // Navigate to CampaignConstructor
  };

  const handleAddChapter = () => {
    setNewChapterVisible(true)
  };

  const checkChapterEligibility = (stringId: string) => {
    // Check if the stringId is empty or contains invalid characters for filenames
    const invalidFilenameChars = /[<>:"\/\\|?*\x00-\x1F]/; // Common invalid characters for filenames
    if (stringId === "" || invalidFilenameChars.test(stringId)) {
      return false;
    }
  
    // Convert the input stringId to lowercase for case-insensitive comparison
    const lowercaseId = stringId.toLowerCase();
  
    // Loop through the chapterArray
    for (const chapter of chapters) {
      // Split the chapter string to get the Id part
      const chapterParts = chapter.split(' ');
  
      // Check if there is an Id part and compare it with lowercaseId
      if (chapterParts.length > 1 && chapterParts[1].toLowerCase() === lowercaseId) {
        return false; // Id found, so not eligible
      }
    }
  
    return true; // Id not found, so eligible
  }

  const handleContinueClick = () => {
    if (checkChapterEligibility(newChapterName)) {
      invoke('create_chapter', {chapterId: newChapterName})
        .then(() => {
          setChapterId(newChapterName); // Set global chapterId
          reloadChapterData(); // Reload global chapterData
          navigate(`/campaign-constructor`); // Navigate to CampaignConstructor
        })
    } else {
      alert('Chapter name invalid!')
    }
    
  }

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

  const handleContextMenu = (event: React.MouseEvent, chapter: string) => {
    event.preventDefault();
    setContextChapter(chapter);
    setMenuPosition({ x: event.pageX, y: event.pageY });
    setMenuVisible(true);
  };

  const handleRemove  = () => {
    invoke('remove_chapter', {chapterId: contextChapter})
      .then(() => {
        getChapters();
        setMenuVisible(false);
      })
  }

  return (
    <div className="chapter-select">
      <h1>Chapter Select</h1>
      <div className="chapters-grid">
        {chapters.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((chapter, index) => (
          <div key={index} className="chapter-item" onClick={() => handleChapterClick(chapter)} onContextMenu={(event) => handleContextMenu(event, chapter)}>
            <img src="/assets/book.svg" alt="Book icon" className="chapter-icon" />
            <p>{chapter}</p>
          </div>
        ))}
        {menuVisible && (
        <ul className="context-menu" style={{ top: `${menuPosition.y - 40}px`, left: `${menuPosition.x}px` }}>
          <p onClick={handleRemove}>Remove</p>
        </ul>
      )}
        <div className="chapter-item add-chapter" onClick={handleAddChapter}>
          <img src="/assets/plus.svg" alt="Add chapter icon" className="chapter-icon" />
          <p>Add Chapter</p>
        </div>
      </div>
      {newChapterVisible && (
        <div className="new-chapter-menu">
          <input type="text" className='new-chapter-input' placeholder='Chapter Name' onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewChapterName(event.target.value)}/>
          <div className='new-chapter-controls'>
            <p className="new-chapter-continue" onClick={handleContinueClick}>Continue</p>
            <p className="new-chapter-cancel" onClick={() => {setNewChapterVisible(false); setNewChapterName("")}}>Cancel</p>            
          </div>
          
        </div>
      )}
    </div>
  );
}

export default ChapterSelect;
