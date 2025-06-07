import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { Combat, useGlobalState, useReloadChapterData } from "./GlobalStateContext"; // Import global state
import '../styles/components/BattlemapController.css';

interface props {
    combatData: Combat;
}

function BattlemapController({ combatData }: props) {
    const { chapterId } = useGlobalState(); // Access chapterId from the global context

    const [size, setSize] = useState(combatData.mapsize);
    const [xOffset, setXOffset] = useState(combatData.mapoffset.x);
    const [yOffset, setYOffset] = useState(combatData.mapoffset.y);
    const reloadChapterData = useReloadChapterData();

    // Handlers for slider change
    const handleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSize(Number(event.target.value));
    };

    const sendSizeChange = (size: number) => {
        invoke('update_battlemap_size', { chapterId, battlemap: combatData.battlemap, size: size })
            .then(()=> {
                reloadChapterData();
            });
    };

    const handleSizeReset = () => {
        setSize(100);
        sendSizeChange(100);
    };

    // Handlers for xOffset change
    const handleXOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setXOffset(Number(event.target.value));
    };

    const sendXOffsetChange = (xoffset: number) => {
        invoke('update_battlemap_xoffset', { chapterId, battlemap: combatData.battlemap, xoffset: xoffset })
            .then(()=> {
                reloadChapterData();
            });
    };

    const handleXOffsetReset = () => {
        setXOffset(0);
        sendXOffsetChange(0);
    };

    // Handlers for yOffset change
    const handleYOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setYOffset(Number(event.target.value));
    };

    const sendYOffsetChange = (yoffset: number) => {
        invoke('update_battlemap_yoffset', { chapterId, battlemap: combatData.battlemap, yoffset: yoffset })
            .then(()=> {
                reloadChapterData();
            });
    };

    const handleYOffsetReset = () => {
        setYOffset(0);
        sendYOffsetChange(0);
    };

    return (
        <>
            <div className="battlemap">

                <div className="battlemap-icon-container">
                    <img src={`../tableau/assets/battlemaps/${combatData.battlemap}`} alt="" className="battlemap-icon" />
                </div>

                <div className="sliders-container">
                    <div className="slider">
                        <p>Size: {size}</p>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={size}
                            onChange={handleSizeChange}
                            onMouseUp={() => sendSizeChange(size)} // Send the updated size on mouse release
                            onKeyUp={(e) => e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "ArrowLeft" ? sendSizeChange(size) : null}
                        />
                        <p onClick={handleSizeReset} className="reset">Reset</p>
                    </div>
                    <div className="slider">
                        <p>x Offset: {xOffset}</p>
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            value={xOffset}
                            onChange={handleXOffsetChange}
                            onMouseUp={() => sendXOffsetChange(xOffset)} // Send the updated xOffset on mouse release
                            onKeyUp={(e) => e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "ArrowLeft" ? sendXOffsetChange(xOffset) : null}
                        />
                        <p onClick={handleXOffsetReset} className="reset">Reset</p>
                    </div>
                    <div className="slider">
                        <p>y Offset: {yOffset}</p>
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            value={yOffset}
                            onChange={handleYOffsetChange}
                            onMouseUp={() => sendYOffsetChange(yOffset)} // Send the updated yOffset on mouse release
                            onKeyUp={(e) => e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "ArrowLeft" ? sendYOffsetChange(yOffset) : null}
                        />
                        <p onClick={handleYOffsetReset} className="reset">Reset</p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default BattlemapController;
