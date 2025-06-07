import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

export interface Splash {
    allegiance: string;
    image: string;
}

export interface Coordinates {
    x: number;
    y: number;
}

export interface Hitpoints {
    current: number;
    max: number;
}

export interface Combat {
    battlemap: string;
    mapsize: number;
    mapoffset: Coordinates;
    gridsize: number;
    gridoffset: Coordinates;
    entities: string[];
}

export const defaultCombat: Combat = {
    battlemap: '', // empty string for battlemap
    mapsize: 0, // 0 for mapsize
    mapoffset: {
        // 0 for map offset
        x: 0,
        y: 0,
    },
    gridsize: 0, // 0 for gridsize
    gridoffset: {
        // 0 for grid offset
        x: 0,
        y: 0,
    },
    entities: [], // empty array for entities
};

export interface Entity {
    icon: string;
    allegiance: string;
    size: string;
    location: Coordinates;
    hitpoints: Hitpoints;
    visible: boolean;
    dead: boolean;
    modifiers: string;
}

export interface EntityData {
    entities: Entity[];
}

export interface ChapterData {
    combat: Combat[];
    landscapes: string[];
    splashes: Splash[];
}

interface GlobalStateContextType {
    chapterId: string;
    setChapterId: React.Dispatch<React.SetStateAction<string>>;
    battlemapId: string;
    setBattlemapId: React.Dispatch<React.SetStateAction<string>>;
    updateBattlemapId: (battlemapId: string) => void;
    chapterData: ChapterData;
    entityData: Entity[];
    setChapterData: React.Dispatch<React.SetStateAction<ChapterData>>;
    reloadChapterData: () => void;
    reloadEntityData: (battlemapId: string | undefined) => void;
    getCombatData: (chapterData: ChapterData, battlemapId: string) => Combat;
    openDisplayWindow: (state: string) => void;
}

// Utility function to access reloadChapterData
export const useReloadChapterData = () => {
    const context = useContext(GlobalStateContext);
    if (!context) {
        throw new Error(
            'useReloadChapterData must be used within a GlobalStateProvider'
        );
    }
    return context.reloadChapterData;
};

export const useUpdateBattlemapId = () => {
    const context = useContext(GlobalStateContext);
    if (!context) {
        throw new Error(
            'useUdateBattlemapId must be used within a GlobalStateProvider'
        );
    }
    return context.updateBattlemapId;
};

// Utility function to access reloadChapterData
export const useReloadEntityData = () => {
    const context = useContext(GlobalStateContext);
    if (!context) {
        throw new Error(
            'useReloadEntityData must be used within a GlobalStateProvider'
        );
    }
    return context.reloadEntityData;
};

export const useOpenDisplayWindow = () => {
    const context = useContext(GlobalStateContext);
    if (!context) {
        throw new Error(
            'useOpenDisplayWindow must be used within a GlobalStateProvider'
        );
    }
    return context.openDisplayWindow;
};

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
    undefined
);

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
    const [chapterId, setChapterId] = useState<string>(
        localStorage.getItem('chapterId') ?? ''
    );

    const [chapterData, setChapterData] = useState<ChapterData>(() => {
        // Initialize from localStorage or default to an empty structure
        const storedChapterData = localStorage.getItem('chapterData');
        return storedChapterData
            ? JSON.parse(storedChapterData)
            : {
                  combat: [],
                  landscapes: [],
                  splashes: [],
              };
    });

    const [battlemapId, setBattlemapId] = useState<string>(() => {
        return localStorage.getItem('battlemapId') || '';
    });

    const updateBattlemapId = useCallback((newBattlemapId: string) => {
        setBattlemapId(newBattlemapId);
        emit('battlemapId', newBattlemapId);
    }, []);

    const getCombatData = (chapterData: ChapterData, battlemapId: string) => {
        reloadChapterData();
        const combatData: Combat | undefined = chapterData.combat.find(
            (combat: Combat) => combat.battlemap === battlemapId
        );

        return combatData!;
    };

    // New state to store the entities data
    const [entityData, setEntityData] = useState<Entity[]>(() => {
        // Initialize from localStorage or default to an empty array
        const storedEntityData = localStorage.getItem('entityData');
        return storedEntityData ? JSON.parse(storedEntityData) : [];
    });

    // Function to reload chapter data from the backend
    const reloadChapterData = useCallback(() => {
        if (chapterId) {
            invoke<ChapterData>('get_chapter_data', { chapterId })
                .then((data) => {
                    setChapterData(data);
                    emit('chapterData', data);
                })
                .catch((error) =>
                    console.error('Failed to reload chapter data:', error)
                );
        }
    }, [chapterId]);

    // Function to reload entity data from the backend for a specific battlemap
    const reloadEntityData = useCallback(
        (battlemapId: string) => {
            if (chapterId) {
                invoke<Entity[]>('get_entities', { chapterId, battlemapId })
                    .then((entities) => {
                        // Update the entityData state with the new entities
                        setEntityData(entities);
                        // emitter function
                        emit('entityData', entities);
                        // Persist to localStorage
                        localStorage.setItem(
                            'entityData',
                            JSON.stringify(entities)
                        );
                    })
                    .catch((error) =>
                        console.error('Failed to reload entity data:', error)
                    );
            }
        },
        [chapterId]
    );

    const openDisplayWindow = (state: string) => {
        const displayWindow = new WebviewWindow('display', {
            title: 'Display',
            width: 1280,
            height: 720,
            resizable: false,
            url: `index.html#/${state}`,
        });
        // Optional: Handle window events
        displayWindow.once('tauri://created', () => {
            console.log('Display window created successfully');
        });

        displayWindow.once('tauri://error', (e) => {
            console.error('Failed to create the display window:', e);
        });
    };

    // Save the `chapterId` to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('chapterId', chapterId);
    }, [chapterId]);

    // Save the `battlemapId` to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('battlemapId', battlemapId);
    }, [battlemapId]);

    useEffect(() => {
        // Save the `chapterData` to localStorage whenever it changes
        localStorage.setItem('chapterData', JSON.stringify(chapterData));
    }, [chapterData]);

    // Save the `entityData` to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('entityData', JSON.stringify(entityData));
    }, [entityData]);

    useEffect(() => {
        const unlistenCombatConstructorDisplay = listen(
            'requestCombatConstructorDisplayData',
            () => {
                emit('chapterData', chapterData);
                emit('battlemapId', battlemapId);
            }
        );

        const unlistenEntityLocationUpdate = listen(
            'entityLocationUpdate',
            (event) => {
                const newEntityData = event.payload as Entity;
                invoke('update_entity', { entity: newEntityData }).then(() => {
                    reloadEntityData(battlemapId);
                });
            }
        );

        return () => {
            unlistenCombatConstructorDisplay.then((unsub) => unsub());
            unlistenEntityLocationUpdate.then((unsub) => unsub());
        };
    }, []);

    return (
        <GlobalStateContext.Provider
            value={{
                chapterId,
                setChapterId,
                chapterData,
                battlemapId,
                setBattlemapId,
                updateBattlemapId,
                entityData,
                setChapterData,
                reloadChapterData,
                reloadEntityData,
                getCombatData,
                openDisplayWindow,
            }}
        >
            {children}
        </GlobalStateContext.Provider>
    );
};

export const useGlobalState = () => {
    const context = useContext(GlobalStateContext);
    if (!context) {
        throw new Error(
            'useGlobalState must be used within a GlobalStateProvider'
        );
    }
    return context;
};
