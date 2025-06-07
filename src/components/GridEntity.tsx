import { useEffect, useState } from 'react';
import { Entity } from './GlobalStateContext';

interface Props {
    entity: Entity;
}

function GridEntity({ entity }: Props) {
    const [isHovering, setIsHovering] = useState(false);
    const [hpColour, setHpColour] = useState('rgba(0, 0, 0, 0)');

    useEffect(() => {
        setHpColour(getHPColour());
        console.log(isHovering);
    }, [isHovering, entity.hitpoints.current, entity.hitpoints.max]);

    const getHPColour = () => {
        const hp = entity.hitpoints.current / entity.hitpoints.max;

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
    };

    return (
        <div
            className={`grid-entity-container`}
            style={{
                filter: entity.dead ? 'grayscale(100%)' : 'none',
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <img
                src={`../tableau/assets/entities/${entity.icon}`}
                alt={`../tableau/assets/entities/${entity.icon}`}
                className={`grid-entity-icon-${entity.allegiance}`}
            />
            <div
                className='healthbar'
                style={{
                    width: `${
                        (entity.hitpoints.current / entity.hitpoints.max) *
                        100 *
                        0.95
                    }%`,
                    backgroundColor: hpColour,
                    zIndex: 1000,
                    opacity: 0,
                }}
            ></div>
        </div>
    );
}

export default GridEntity;
