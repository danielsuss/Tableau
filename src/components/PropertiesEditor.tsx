import { invoke } from "@tauri-apps/api/core";
import { Entity, Coordinates, Hitpoints, useGlobalState, useReloadEntityData } from "./GlobalStateContext";
import { useState } from "react";

interface props {
    entity: Entity,
    battlemap: string,
    setEditorProperties: (state: string) => void
}

function PropertiesEditor ({entity, battlemap, setEditorProperties} : props) {
    const { chapterId } = useGlobalState();
    const [entityCoordinates, setEntityCoordinates] = useState({x: entity.location.x, y: entity.location.y})
    const [entityHitpoints, setEntityHitpoints] = useState({current: entity.hitpoints.current, max: entity.hitpoints.max})
    const [entityModifiers, setEntityModifiers] = useState(entity.modifiers);
    const reloadEntityData = useReloadEntityData();

    const sendEntityUpdate = () => {
        entity.location = entityCoordinates;
        entity.hitpoints = entityHitpoints;
        entity.modifiers = entityModifiers
        invoke('update_entity', {entity: entity})
            .then(() => {
                reloadEntityData(battlemap);
            })
    }

    const handleChangeAllegiance = () => {
        let newAllegiance = entity.allegiance === "neutral" ? "evil" : "neutral";
        entity.allegiance = newAllegiance;
        sendEntityUpdate();
    }

    const handleRemoveEntity = () => {
        invoke('remove_entity', {chapterId: chapterId, battlemapId: battlemap, iconId: entity.icon})
            .then(() => {
                setEditorProperties("editor");
            })
    }

    const handleXChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEntityCoordinates({x: Number(event.target.value), y: entityCoordinates.y})
    }

    const handleYChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEntityCoordinates({x: entityCoordinates.x, y: Number(event.target.value)})
    }

    const handleHPCurrentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEntityHitpoints({current: Number(event.target.value), max: entityHitpoints.max})
    }

    const handleHPMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEntityHitpoints({current: entityHitpoints.current, max: Number(event.target.value)})
    }

    const handleModifiersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEntityModifiers(event.target.value)
    }

    const handleVisible = () => {
        let visibility = entity.visible === true ? false: true;
        entity.visible = visibility;
        sendEntityUpdate();
    }

    const handleDead = () => {
        let deadState = entity.dead === true ? false: true;
        entity.dead = deadState;
        sendEntityUpdate();
    }

    return(
        <div className="icon-properties">
            <div className="properties-top-bar">
                <div className="properties-icon-container">
                    <img src={`../tableau/assets/entities/${entity.icon}`} alt={`${entity.icon}`} className={`properties-icon-${entity.allegiance}`} />
                </div>                
                <div className="entity-properties-container">
                    <div className="properties-property">
                        Starting Coordinates (x, y):
                        <input type="number" className="properties-number-input" min="0" step="1" value={entityCoordinates.x} onChange={handleXChange} onBlur={sendEntityUpdate} />
                        <input type="number" className="properties-number-input" min="0" step="1" value={entityCoordinates.y} onChange={handleYChange} onBlur={sendEntityUpdate} />
                    </div>
                    <div className="properties-property">
                        Hitpoints (current / max):
                        <input type="number" className="properties-number-input" min="0" step="1" value={entityHitpoints.current} onChange={handleHPCurrentChange} onBlur={sendEntityUpdate} />
                        {/* <p style={{font: "large"}}>/</p> */}
                        <input type="number" className="properties-number-input" min="1" step="1" value={entityHitpoints.max} onChange={handleHPMaxChange} onBlur={sendEntityUpdate} />
                    </div>
                    <div className="properties-property">
                        Modifiers:
                        <input type="text" className="modifiers" value={entityModifiers} onChange={handleModifiersChange} onBlur={sendEntityUpdate} />
                    </div>
                    <div className="properties-property">
                        <div className="visible-dead" onClick={handleVisible}>Visible: {String(entity.visible)}</div>
                        <div className="visible-dead" onClick={handleDead}>Dead: {String(entity.dead)}</div>
                    </div>
                </div>
            </div>
            <div className="properties-bottom-container">
                <div className="swap-allegiance" onClick={handleChangeAllegiance}>Swap Allegiance</div>
                <div className="remove-entity" onClick={handleRemoveEntity}>Remove Entity</div>
            </div>
            
            
        </div>
        
    );
}

export default PropertiesEditor