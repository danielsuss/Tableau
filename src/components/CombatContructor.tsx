import { useNavigate, useParams } from 'react-router-dom';
import BattlemapController from './BattlemapController';
import {
    Combat,
    useGlobalState,
    useOpenDisplayWindow,
    useReloadChapterData,
    useReloadEntityData,
    useUpdateBattlemapId,
} from './GlobalStateContext'; // Import the global state
import HexgridController from './HexgridController';
import { useEffect, useState } from 'react';
import IconEditor from './IconEditor';
import ConstructorEntity from './ConstructorEntity';
import PropertiesEditor from './PropertiesEditor';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import '../styles/components/CombatConstructor.css';

function CombatConstructor() {
    const { chapterData, chapterId, entityData, battlemapId } =
        useGlobalState(); // Access chapterId from the global context
    const [editorProperties, setEditorProperties] = useState('editor');
    const [isNarrowWidth, setIsNarrowWidth] = useState(window.innerWidth <= 800);
    const { battlemap = '' } = useParams(); // Get the battlemap from the route
    const navigate = useNavigate();
    const reloadChapterData = useReloadChapterData();
    const openDisplayWindow = useOpenDisplayWindow();
    const reloadEntityData = useReloadEntityData();
    const updateBattlemapId = useUpdateBattlemapId();
    const [selectedEntity, setSelectedEntity] = useState('');

    const combatData: Combat = chapterData.combat.find(
        (combat: Combat) => combat.battlemap === battlemap
    )!;

    // Only reload entity data when component mounts or battlemap changes
    useEffect(() => {
        reloadEntityData(battlemap);
    }, [battlemap, reloadEntityData]);

    // Handle window resize to detect narrow width
    useEffect(() => {
        const handleResize = () => {
            const narrowWidth = window.innerWidth <= 800;
            setIsNarrowWidth(narrowWidth);
            
            // Auto-switch to properties mode when narrow
            if (narrowWidth && editorProperties === 'editor') {
                setEditorProperties('properties');
            }
        };

        window.addEventListener('resize', handleResize);
        
        // Set initial state
        if (isNarrowWidth && editorProperties === 'editor') {
            setEditorProperties('properties');
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [editorProperties, isNarrowWidth]);

    // Listen for entity selection from display window
    useEffect(() => {
        const unlistenEntitySelection = listen('entitySelectedInDisplay', (event) => {
            const entityIcon = event.payload as string;
            if (entityIcon !== '') {
                // Only sync selection, not deselection
                setSelectedEntity(entityIcon);
                setEditorProperties('properties');
            }
        });

        return () => {
            unlistenEntitySelection.then((unsub) => unsub());
        };
    }, []);

    const handleBackClick = () => {
        updateBattlemapId('');
        emit('combatUnselected');
        navigate(`/campaign-constructor`);
    };

    const handleEditorButton = () => {
        setEditorProperties('editor');
        setSelectedEntity('');
    };

    const handlePropertiesButton = () => {
        setEditorProperties('properties');
    };

    const handleEntityClick = (icon: string) => {
        setSelectedEntity(icon);
        setEditorProperties('properties');
    };

    const handleShowDisplay = () => {
        invoke('generate_hexgrid', {
            containerWidth: 1667,
            containerHeight: 953,
            hexSize: combatData.gridsize,
            overflow: 3,
            outputPath: `../tableau/assets/hexgrids/${combatData.battlemap}`,
        }).then(() => {
            reloadChapterData();
            openDisplayWindow(`combat-display/${chapterId}/${battlemapId}`);
        });
    };

    const handleToggleGrid = () => {
        console.log('Emitting toggleGrid event');
        emit('toggleGrid');
    };

    const handleToggleEntities = () => {
        console.log('Emitting toggleEntities event');
        emit('toggleEntities');
    };

    // Find the currently selected entity
    const selectedEntityData = entityData.find(
        (entity) => entity.icon === selectedEntity
    );

    return (
        <div className='constructor-container combat-constructor'>
            <div className='nav-bar'>
                <div className='back-button-container'>
                    <div
                        className='back-button'
                        onClick={handleBackClick}
                    >
                        <img
                            src='/assets/back.svg'
                            alt='Back'
                            className='back-icon'
                        />
                    </div>
                </div>
                {!isNarrowWidth && <div className='header-container'>
                    Combat Constructor: Chapter {chapterId}
                </div>}
                <div className='show-display-container'>
                    <div
                        className='show-display'
                        onClick={handleToggleGrid}
                    >
                        Toggle Grid
                    </div>
                    <div
                        className='show-display'
                        onClick={handleToggleEntities}
                    >
                        Toggle Entities
                    </div>
                    <div
                        className='show-display'
                        onClick={handleShowDisplay}
                    >
                        Show Display
                    </div>
                </div>
            </div>

            <div className='battlemap-container'>
                <BattlemapController combatData={combatData} />
                <HexgridController combatData={combatData} />
            </div>

            <div className='entities-container'>
                <div className='icons'>
                    {entityData.map((entity, index) => (
                        <div
                            key={index}
                            className={`entity-container-clicked-${
                                selectedEntity === entity.icon
                            }`}
                            onClick={() => handleEntityClick(entity.icon)}
                        >
                            <ConstructorEntity entity={entity} />
                        </div>
                    ))}
                </div>

                <div className='rightside-container'>
                    <div className={`editor-properties-buttons ${isNarrowWidth ? 'narrow-width' : ''}`}>
                        <button
                            className='editor-button'
                            onClick={handleEditorButton}
                            disabled={editorProperties === 'editor'}
                        >
                            Editor
                        </button>
                        <button
                            className='properties-button'
                            onClick={handlePropertiesButton}
                            disabled={editorProperties === 'properties'}
                        >
                            Properties
                        </button>
                    </div>

                    <div className='editor-properties-container'>
                        {editorProperties === 'editor' ? (
                            <IconEditor battlemap={battlemap} />
                        ) : selectedEntity === '' ? (
                            <div className='icon-properties-placeholder'>
                                Select entity to view properties
                            </div>
                        ) : (
                            <PropertiesEditor
                                entity={selectedEntityData!}
                                battlemap={battlemap}
                                setEditorProperties={setEditorProperties}
                                key={selectedEntity} // Add key prop to force re-render
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CombatConstructor;
