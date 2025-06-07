import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useGlobalState } from './GlobalStateContext';
import '../styles/components/LandscapeElement.css';
import { emit, listen } from '@tauri-apps/api/event';

function LandscapeElement({
    filename,
    reloadChapterData,
}: {
    filename: string;
    reloadChapterData: () => void;
}) {
    const { chapterId } = useGlobalState(); // Access global chapterId
    const [isSelected, setSelected] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

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
            setTimeout(
                () => document.addEventListener('click', handleClickOutside),
                0
            );
            setTimeout(
                () =>
                    document.addEventListener(
                        'contextmenu',
                        handleClickOutside
                    ),
                0
            ); // Right-click detection
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('contextmenu', handleClickOutside);
        };
    }, [menuVisible]);

    const handleRemove = () => {
        invoke('remove_landscape', { chapterId, filename })
            .then(() => {
                if (isSelected) {
                    emit('landscapeUnselected');
                }
                reloadChapterData();
            })
            .catch((error) => console.error(error));
    };

    const handleClick = () => {
        if (!isSelected) {
            emit('landscapeSelected', filename);
            console.log('selected');
            setSelected(true);
        } else {
            emit('landscapeUnselected');
            console.log('unselected');
            setSelected(false);
        }
    };

    useEffect(() => {
        const unlistenLandscapeSelected = listen(
            'landscapeSelected',
            (event) => {
                if ((event.payload as string) !== filename) {
                    setSelected(false);
                }
            }
        );

        const unlistenLandscapeUnselected = listen(
            'landscapeUnselected',
            () => {
                setSelected(false);
            }
        );

        return () => {
            unlistenLandscapeSelected.then((unsub) => unsub());
            unlistenLandscapeUnselected.then((unsub) => unsub());
        };
    }, []);

    return (
        <>
            <div
                className={`element-item landscape ${
                    isSelected ? 'element-selected' : ''
                }`}
                onContextMenu={handleContextMenu}
            >
                <img
                    src={`../tableau/assets/landscapes/${filename}`}
                    alt={filename}
                    onClick={handleClick}
                />
            </div>
            {menuVisible && (
                <ul
                    className='context-menu'
                    style={{
                        top: `${menuPosition.y - 40}px`,
                        left: `${menuPosition.x}px`,
                    }}
                >
                    <p onClick={handleRemove}>Remove</p>
                </ul>
            )}
        </>
    );
}

export default LandscapeElement;
