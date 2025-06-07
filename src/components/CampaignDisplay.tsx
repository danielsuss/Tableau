import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { Splash } from './GlobalStateContext';
import { getCurrentWindow } from '@tauri-apps/api/window';
import CombatDisplay from './CombatDisplay';
import '../styles/components/CampaignDisplay.css';

function CampaignDisplay() {
    const [landscape, setLandscape] = useState<String | null>(null);
    const [splashes, setSplashes] = useState<Splash[]>([]);
    const [fullscreen, setFullscreen] = useState(false);
    const [window] = useState(getCurrentWindow());
    const [combatData, setCombatData] = useState<{ chapterId: string; battlemapId: string } | null>(null);

    useEffect(() => {
        const unlistenLandscapeSelected = listen(
            'landscapeSelected',
            (event) => {
                const filename = event.payload as string;
                setLandscape(filename);
                setCombatData(null); // Switch back to campaign view
            }
        );

        const unlistenLandscapeUnselected = listen(
            'landscapeUnselected',
            () => {
                console.log('unselected');
                setLandscape(null);
            }
        );

        const unlistenSplashSelected = listen('splashSelected', (event) => {
            const splash = event.payload as Splash;
            setSplashes((prevSplashes) => [...prevSplashes, splash]);
            setCombatData(null); // Switch back to campaign view
        });

        const unlistenSplashUnselected = listen('splashUnselected', (event) => {
            setSplashes((prevSplashes) =>
                prevSplashes.filter(
                    (splash) => splash.image !== (event.payload as Splash).image
                )
            );
        });

        const unlistenCombatSelected = listen('combatSelected', (event) => {
            const payload = event.payload as { chapterId: string; battlemapId: string };
            setCombatData(payload);
        });

        const unlistenCombatUnselected = listen('combatUnselected', () => {
            setCombatData(null);
        });

        const unlistenClearAllSplashes = listen('clearAllSplashes', () => {
            setSplashes([]);
        });

        return () => {
            unlistenLandscapeSelected.then((unsub) => unsub());
            unlistenLandscapeUnselected.then((unsub) => unsub());
            unlistenSplashSelected.then((unsub) => unsub());
            unlistenSplashUnselected.then((unsub) => unsub());
            unlistenCombatSelected.then((unsub) => unsub());
            unlistenCombatUnselected.then((unsub) => unsub());
            unlistenClearAllSplashes.then((unsub) => unsub());
        };
    }, []);

    const handleFullscreenClick = () => {
        console.log('fullscreen', fullscreen);
        window
            .setFullscreen(!fullscreen)
            .then(() => setFullscreen(!fullscreen));
    };

    // If combat is selected, show CombatDisplay
    if (combatData) {
        return <CombatDisplay chapterId={combatData.chapterId} battlemapId={combatData.battlemapId} />;
    }

    return (
        <div
            className='display-window-container'
            onClick={handleFullscreenClick}
        >
            {landscape !== null ? (
                landscape && (
                    <div className='campaign-display-container'>
                        <img
                            src={`../tableau/assets/landscapes/${landscape}`}
                            className='campaign-display-landscape'
                            alt=''
                        />
                        <div className='campaign-display-grid'>
                            {splashes.map((splash, index) => (
                                <img
                                    className={`campaign-display-splash ${
                                        splash.allegiance === 'neutral'
                                            ? 'splash-neutral'
                                            : 'splash-evil'
                                    }`}
                                    key={index}
                                    src={`../tableau/assets/splashes/${splash.image}`}
                                />
                            ))}
                        </div>
                    </div>
                )
            ) : (
                <p style={{ fontStyle: 'italic' }}>Nothing to display...</p>
            )}
        </div>
    );
}

export default CampaignDisplay;
