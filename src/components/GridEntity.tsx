import { Entity } from './GlobalStateContext';

interface Props {
    entity: Entity;
}

function GridEntity({ entity }: Props) {

    const getHPColour = () => {
        const hp = entity.hitpoints.current / entity.hitpoints.max;
        if (hp > 1) {
            return 'rgb(0, 255, 255)';
        } else if (hp > 0.5) {
            return 'rgb(0, 255, 0)';
        } else if (hp > 0.25) {
            return 'rgb(255, 255, 0)';
        } else {
            return 'rgb(255, 0, 0)';
        }
    }

    return (
        <>
            <img
                src={`../tableau/assets/entities/${entity.icon}`}
                alt={`../tableau/assets/entities/${entity.icon}`}
                className={`grid-entity-icon-${entity.allegiance}`}
            />
            <div
                className='healthbar'
                style={{
                    width: `${(entity.hitpoints.current / entity.hitpoints.max) * 100 * 1.2}%`,
                    backgroundColor: getHPColour()
                }}
            ></div>
        </>
    );
}

export default GridEntity;
