import { Entity } from "./GlobalStateContext";
import '../styles/components/ConstructorEntity.css';

interface props {
    entity: Entity;
}

function ConstructorEntity ( {entity} : props ) {
    let iconId = entity.icon;
    let allegiance = entity.allegiance;

    return(
        <img src={`../tableau/assets/entities/${iconId}`} alt={`${iconId}`} className={`entity-icon allegiance-${allegiance}`} />
    );
}

export default ConstructorEntity;