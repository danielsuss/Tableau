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
import { getCurrentWindow } from '@tauri-apps/api/window';
import Button from './Button';

function CombatDisplay({ chapterId: propChapterId, battlemapId: propBattlemapId }: { chapterId?: string; battlemapId?: string } = {}) {
    // const { chapterData: initChapterData, battlemapId: initBattlemapId } = useGlobalState();

    const initChapterData: ChapterData = {
        combat: [],
        splashes: [],
        landscapes: [],
    };
    const { chapterid: urlChapterId, battlemapid: urlBattlemapId } = useParams();

    // Use props if provided, otherwise fall back to URL params
    const chapterId = propChapterId || urlChapterId;
    const initBattlemapId = propBattlemapId || urlBattlemapId;

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
    const [hoveredEntity, setHoveredEntity] = useState<Entity | null>(null);
    const [arrow, setArrow] = useState<{startGrid: {x: number, y: number}, endGrid: {x: number, y: number}} | null>(null);
    const [isDrawingArrow, setIsDrawingArrow] = useState(false);
    const [arrowStartGrid, setArrowStartGrid] = useState<{x: number, y: number} | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [window] = useState(getCurrentWindow());

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

    const handleEntityMouseDown = (
        event: MouseEvent<HTMLDivElement>,
        entity: Entity
    ) => {
        if (event.button !== 0) return;
        console.log('entity clicked:', entity);
        setSelectedEntity(entity);
    };

    const handleRightClick = (event: MouseEvent<HTMLDivElement>) => {
        // Always prevent default context menu
        event.preventDefault();
    };

    const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
        if (event.button === 2 && isDrawingArrow) { // Right mouse button up
            // Finalize arrow
            if (arrowStartGrid && containerRef.current) {
                const { left, top, width, height } = containerRef.current.getBoundingClientRect();
                const percentX = ((event.clientX - left) / width) * 100;
                const percentY = ((event.clientY - top) / height) * 100;

                // Calculate end grid coordinates
                const endY = (() => {
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

                const endX = (() => {
                    let min = Infinity;
                    let nearest = 0;
                    for (let i = 0; i < percentageCenters.x.length; i++) {
                        const distance = Math.abs(
                            percentageCenters.x[i] - (percentX - (endY % 2 !== 0 ? percentageCenters.offset : 0))
                        );
                        if (distance < min) {
                            min = distance;
                            nearest = i;
                        }
                    }
                    return nearest;
                })();

                setArrow({ startGrid: arrowStartGrid, endGrid: { x: endX, y: endY } });
                setIsDrawingArrow(false);
                setArrowStartGrid(null);
            }
        }
    };

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        if (event.button === 2) { // Right click
            event.preventDefault();
            
            // If there's an existing arrow and we're not drawing, clear it
            if (arrow && !isDrawingArrow) {
                setArrow(null);
                setSelectedEntity(null);
                return;
            }
            
            // Start drawing new arrow if not currently drawing
            if (!isDrawingArrow && containerRef.current) {
                const { left, top, width, height } = containerRef.current.getBoundingClientRect();
                const percentX = ((event.clientX - left) / width) * 100;
                const percentY = ((event.clientY - top) / height) * 100;

                // Calculate start grid coordinates
                const startY = (() => {
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

                const startX = (() => {
                    let min = Infinity;
                    let nearest = 0;
                    for (let i = 0; i < percentageCenters.x.length; i++) {
                        const distance = Math.abs(
                            percentageCenters.x[i] - (percentX - (startY % 2 !== 0 ? percentageCenters.offset : 0))
                        );
                        if (distance < min) {
                            min = distance;
                            nearest = i;
                        }
                    }
                    return nearest;
                })();

                setArrowStartGrid({ x: startX, y: startY });
                setIsDrawingArrow(true);
                setSelectedEntity(null);
            }
        }
    };

    const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
        if (isDrawingArrow && arrowStartGrid && containerRef.current) {
            const { left, top, width, height } = containerRef.current.getBoundingClientRect();
            const percentX = ((event.clientX - left) / width) * 100;
            const percentY = ((event.clientY - top) / height) * 100;

            // Calculate current grid coordinates
            const currentY = (() => {
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

            const currentX = (() => {
                let min = Infinity;
                let nearest = 0;
                for (let i = 0; i < percentageCenters.x.length; i++) {
                    const distance = Math.abs(
                        percentageCenters.x[i] - (percentX - (currentY % 2 !== 0 ? percentageCenters.offset : 0))
                    );
                    if (distance < min) {
                        min = distance;
                        nearest = i;
                    }
                }
                return nearest;
            })();

            setArrow({ startGrid: arrowStartGrid, endGrid: { x: currentX, y: currentY } });
        }
    };

    const handleLeftClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        if (selectedEntity !== null) {
            console.log('entity selected:', selectedEntity);
            if (!containerRef.current) return;
            const { left, top, width, height } =
                containerRef.current.getBoundingClientRect();

            // Calculate percentage-based coordinates
            const percentX = ((event.clientX - left) / width) * 100;
            const percentY = ((event.clientY - top) / height) * 100;

            console.log(
                `Clicked at: ${percentX.toFixed(2)}% X, ${percentY.toFixed(
                    2
                )}% Y`
            );

            // Calculate grid coordinates
            const newY = (() => {
                let min = Infinity;
                let nearest = 0;

                for (let i = 0; i < percentageCenters.y.length; i++) {
                    const distance = Math.abs(
                        percentageCenters.y[i] - percentY
                    );
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
                    const distance = Math.abs(
                        percentageCenters.x[i] -
                            (percentX -
                                (newY % 2 !== 0 ? percentageCenters.offset : 0))
                    );
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

    const handleFullscreenClick = () => {
        console.log('fullscreen', fullscreen);
        window
            .setFullscreen(!fullscreen)
            .then(() => setFullscreen(!fullscreen));
    };

    return (
        <div className='no-anti-alias'>
            <TransformWrapper 
                disabled={!isTransformEnabled}
                panning={{ 
                    disabled: false,
                    allowLeftClickPan: false,
                    allowRightClickPan: false,
                    allowMiddleClickPan: true
                }}
                doubleClick={{ disabled: true }}
            >
                <TransformComponent>
                    <div className='display-window-container'>
                        <Button onClick={handleFullscreenClick}> </Button>
                        {battlemapId !== '' ? (
                            combatData && (
                                <div
                                    ref={containerRef}
                                    className='combat-display-container'
                                    onMouseDown={(event) => {
                                        handleMouseDown(event);
                                        if (event.button === 0) handleLeftClick(event);
                                    }}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onContextMenu={(event) => {
                                        event.preventDefault();
                                        handleRightClick(event);
                                    }}
                                >
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
                                    {entityData
                                        .filter(
                                            (entity) => entity.visible === true
                                        )
                                        .map((entity, index) => (
                                            <div
                                                key={index}
                                                className={`grid-entity ${
                                                    entity.icon ===
                                                    selectedEntity?.icon
                                                        ? 'grid-entity-selected'
                                                        : ''
                                                }`}
                                                style={{
                                                    left: `${
                                                        percentageCenters.x[
                                                            entity.location.x
                                                        ] +
                                                        (entity.location.y %
                                                            2 !==
                                                        0
                                                            ? percentageCenters.offset
                                                            : 0)
                                                    }%`,
                                                    top: `${
                                                        percentageCenters.y[
                                                            entity.location.y
                                                        ]
                                                    }%`,
                                                    height: `${
                                                        gridsizePercentage * 2.15
                                                    }%`,
                                                }}
                                                onMouseDown={(event) =>
                                                    handleEntityMouseDown(
                                                        event,
                                                        entity
                                                    )
                                                }
                                                onMouseEnter={() => setHoveredEntity(entity)}
                                                onMouseLeave={() => setHoveredEntity(null)}
                                                onContextMenu={handleRightClick}
                                            >
                                                <GridEntity entity={entity} />
                                            </div>
                                        ))}
                                    {/* Health Bar Overlay Layer */}
                                    {entityData
                                        .filter(
                                            (entity) => entity.visible === true
                                        )
                                        .map((entity, index) => {
                                            const hp = entity.hitpoints.current / entity.hitpoints.max;
                                            const isHovering = hoveredEntity?.icon === entity.icon;
                                            const hpColour = (() => {
                                                if (isHovering) {
                                                    if (hp > 1) {
                                                        return 'rgb(0, 255, 255)';
                                                    } else if (hp > 0.5) {
                                                        return 'rgb(0, 255, 0)';
                                                    } else if (hp > 0.25) {
                                                        return 'rgb(255, 255, 0)';
                                                    } else {
                                                        return 'rgb(255, 0, 0)';
                                                    }
                                                } else {
                                                    if (hp > 1) {
                                                        return 'rgba(0, 255, 255, 0.5)';
                                                    } else if (hp > 0.5) {
                                                        return 'rgba(0, 255, 0, 0.5)';
                                                    } else if (hp > 0.25) {
                                                        return 'rgba(255, 255, 0, 0.5)';
                                                    } else {
                                                        return 'rgba(255, 0, 0, 0.5)';
                                                    }
                                                }
                                            })();
                                            
                                            return (
                                                <div
                                                    key={`healthbar-${index}`}
                                                    className='healthbar'
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${
                                                            percentageCenters.x[
                                                                entity.location.x
                                                            ] +
                                                            (entity.location.y %
                                                                2 !==
                                                            0
                                                                ? percentageCenters.offset
                                                                : 0)
                                                        }%`,
                                                        top: `${
                                                            percentageCenters.y[
                                                                entity.location.y
                                                            ] + (gridsizePercentage * 2.15 * 0.55)
                                                        }%`,
                                                        width: `${
                                                            (entity.hitpoints.current / entity.hitpoints.max) *
                                                            95 *
                                                            (gridsizePercentage / 100)
                                                        }%`,
                                                        height: `${
                                                            gridsizePercentage * 2.15 * 0.05
                                                        }%`,
                                                        backgroundColor: hpColour,
                                                        transform: 'translate(-50%, 0)',
                                                        zIndex: 1000,
                                                        pointerEvents: 'none',
                                                    }}
                                                ></div>
                                            );
                                        })}
                                    {/* Arrow Overlay */}
                                    {arrow && (
                                        <svg
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                pointerEvents: 'none',
                                                zIndex: 900,
                                            }}
                                        >
                                            <defs>
                                                <marker
                                                    id="arrowhead"
                                                    markerWidth="10"
                                                    markerHeight="7"
                                                    refX="9"
                                                    refY="3.5"
                                                    orient="auto"
                                                >
                                                    <polygon
                                                        points="0 0, 10 3.5, 0 7"
                                                        fill="white"
                                                    />
                                                </marker>
                                            </defs>
                                            <line
                                                x1={`${
                                                    percentageCenters.x[arrow.startGrid.x] +
                                                    (arrow.startGrid.y % 2 !== 0 ? percentageCenters.offset : 0)
                                                }%`}
                                                y1={`${percentageCenters.y[arrow.startGrid.y]}%`}
                                                x2={`${
                                                    percentageCenters.x[arrow.endGrid.x] +
                                                    (arrow.endGrid.y % 2 !== 0 ? percentageCenters.offset : 0)
                                                }%`}
                                                y2={`${percentageCenters.y[arrow.endGrid.y]}%`}
                                                stroke="white"
                                                strokeWidth="3"
                                                markerEnd="url(#arrowhead)"
                                            />
                                        </svg>
                                    )}
                                </div>
                            )
                        ) : (
                            <p style={{ fontStyle: 'italic' }}>
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
