import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import {
    ChapterData,
    Combat,
    Entity,
    defaultCombat,
} from './GlobalStateContext';
import { useEffect, useRef, useState, MouseEvent } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import GridEntity from './GridEntity';
import { generateGridCenters } from '../hexgrid';

function CombatDisplay() {
    // const { chapterData: initChapterData, battlemapId: initBattlemapId } = useGlobalState();

    const initChapterData: ChapterData = {
        combat: [],
        splashes: [],
        landscapes: [],
    };
    const { chapterid: chapterId, battlemapid: initBattlemapId } = useParams();

    const [chapterData, setChapterData] = useState(initChapterData);
    const [battlemapId, setBattlemapId] = useState(initBattlemapId);
    const [combatData, setCombatData] = useState(defaultCombat);
    const [entityData, setEntityData] = useState<Entity[]>([]);

    const initCenters = { x: [0], y: [0], offset: 0 };

    const [percentageCenters, setPercentageCenters] = useState(initCenters);
    const [reload, setReload] = useState(0);

    const [gridsizePercentage, setgridsizePercentage] = useState(1);

    const [isTransformEnabled] = useState(true);
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // const disableTransform = () => setIsTransformEnabled(false);
    // const enableTransform = () => setIsTransformEnabled(true);

    useEffect(() => {
        invoke<ChapterData>('get_chapter_data', { chapterId: chapterId }).then(
            (data) => {
                setChapterData(data);
            }
        );
    }, []);

    useEffect(() => {
        const unlistenChapterData = listen('chapterData', (event) => {
            console.log('chapter data received', event.payload);
            const newChapterData = event.payload as ChapterData;
            setChapterData(newChapterData);
        });

        const unlistenBattlemapId = listen('battlemapId', (event) => {
            console.log('battlemapid received');
            const newBattlemapId = event.payload as string;
            console.log(newBattlemapId);
            setBattlemapId(newBattlemapId);
        });

        const unlistenEntityData = listen('entityData', (event) => {
            // console.log('entityData received');
            const newEntityData = event.payload as Entity[];
            // console.log(newEntityData);
            setEntityData(newEntityData);
        });

        return () => {
            unlistenChapterData.then((unsub) => unsub());
            unlistenBattlemapId.then((unsub) => unsub());
            unlistenEntityData.then((unsub) => unsub());
        };
    }, []);

    useEffect(() => {
        let newCombatData: Combat | undefined = chapterData.combat.find(
            (combat: Combat) => combat.battlemap === battlemapId
        );
        console.log('newCombatData found:', newCombatData); // Log the found data
        if (newCombatData) {
            setCombatData(newCombatData);
        } else {
            setCombatData(defaultCombat); // Optionally handle if not found
        }
    }, [chapterData, battlemapId, combatData]);

    const handleEntityMouseDown = (event: MouseEvent<HTMLDivElement>, entity: Entity) => {
        if (event.button !== 0) return;
        console.log('entity clicked:', entity);
        setSelectedEntity(entity);
    };

    const handleRightClick = () => {
        setSelectedEntity(null);
    };

    const handleLeftClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        if (selectedEntity !== null) {
            console.log('entity selected:', selectedEntity);
            if (!containerRef.current) return;
            const { left, top, width, height } = containerRef.current.getBoundingClientRect();

            // Calculate percentage-based coordinates
            const percentX = ((event.clientX - left) / width) * 100;
            const percentY = ((event.clientY - top) / height) * 100;

            console.log(`Clicked at: ${percentX.toFixed(2)}% X, ${percentY.toFixed(2)}% Y`);

            // Calculate grid coordinates
            const newY = (() => {
                let min = Infinity;
                let nearest = 0;
            
                for (let i = 0; i < percentageCenters.y.length; i++) {
                    const distance = Math.abs(percentageCenters.y[i] - percentY);
                    if (distance < min) {
                        min = distance;
                        nearest = i;
                    }
                }
            
                return nearest;
            })();

            const newX = (() => {
                let min = Infinity;
                let nearest = 0;
            
                for (let i = 0; i < percentageCenters.x.length; i++) {
                    const distance = Math.abs(percentageCenters.x[i] - (percentX - (newY % 2 !== 0 ? percentageCenters.offset : 0)));
                    if (distance < min) {
                        min = distance;
                        nearest = i;
                    }
                }
            
                return nearest;
            })();

            console.log(`Clicked at: ${newX}, ${newY}`);

            selectedEntity.location = { x: newX, y: newY };

            emit('entityLocationUpdate', selectedEntity);

            setSelectedEntity(null);
        }
    };

    useEffect(() => {
        const handle = requestIdleCallback(() => {
            console.log('generating centers');
            const centers = generateGridCenters(
                1667,
                953,
                combatData.gridsize,
                3
            );
            setPercentageCenters(centers);
            console.log(percentageCenters);
            setgridsizePercentage(centers.x[1] - centers.x[0]);
            setReload((prev) => prev + 1);
        });

        return () => cancelIdleCallback(handle);
    }, [combatData.gridsize]);

    return (
        <div className='no-anti-alias'>
            <TransformWrapper disabled={!isTransformEnabled}>
                <TransformComponent>
                    <div className='display-window-container'>
                        {battlemapId !== '' ? (
                            combatData && (
                                <div ref={containerRef} className='combat-display-container' onMouseDown={handleLeftClick} onContextMenu={handleRightClick}>
                                    <img
                                        src={`../tableau/assets/battlemaps/${combatData.battlemap}`}
                                        className='constructor-display-battlemap'
                                        alt=''
                                    />
                                    <div className='hexgrid-container'>
                                        <img
                                            src={`../tableau/assets/hexgrids/${combatData.battlemap}?reload=${reload}`}
                                            className='hexgrid-image'
                                        />
                                    </div>
                                    {entityData.map((entity, index) => (
                                        <div
                                            key={index}
                                            className={`grid-entity ${entity.icon === selectedEntity?.icon ? "grid-entity-selected" : ""}`}
                                            style={{
                                                left: `${
                                                    percentageCenters.x[
                                                        entity.location.x
                                                    ] +
                                                    (entity.location.y % 2 !== 0
                                                        ? percentageCenters.offset
                                                        : 0)
                                                }%`,
                                                top: `${
                                                    percentageCenters.y[
                                                        entity.location.y
                                                    ]
                                                }%`,
                                                height: `${
                                                    gridsizePercentage * 2
                                                }%`,
                                            }}
                                            onMouseDown={(event) => handleEntityMouseDown(event, entity)}
                                            onContextMenu={handleRightClick}
                                        >
                                            <GridEntity entity={entity} />
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <p style={{fontStyle: 'italic'}}>
                                Nothing to display...
                            </p>
                        )}
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
}

export default CombatDisplay;
