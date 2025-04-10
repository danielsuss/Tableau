import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { Splash } from './GlobalStateContext';
import { getCurrentWindow } from '@tauri-apps/api/window';

function CampaignDisplay() {
    const [landscape, setLandscape] = useState<String | null>(null);
    const [splashes, setSplashes] = useState<Splash[]>([]);
    const [fullscreen, setFullscreen] = useState(false);
    const [window] = useState(getCurrentWindow());

    useEffect(() => {
        const unlistenLandscapeSelected = listen(
            'landscapeSelected',
            (event) => {
                const filename = event.payload as string;
                setLandscape(filename);
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
        });

        const unlistenSplashUnselected = listen('splashUnselected', (event) => {
            setSplashes((prevSplashes) =>
                prevSplashes.filter(
                    (splash) => splash.image !== (event.payload as Splash).image
                )
            );
        });

        return () => {
            unlistenLandscapeSelected.then((unsub) => unsub());
            unlistenLandscapeUnselected.then((unsub) => unsub());
            unlistenSplashSelected.then((unsub) => unsub());
            unlistenSplashUnselected.then((unsub) => unsub());
        };
    }, []);

    const handleFullscreenClick = () => {
        console.log('fullscreen', fullscreen);
        window
            .setFullscreen(!fullscreen)
            .then(() => setFullscreen(!fullscreen));
    };

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
