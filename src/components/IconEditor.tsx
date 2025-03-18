import { useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, useTransformComponent} from 'react-zoom-pan-pinch';
import { invoke } from '@tauri-apps/api/core';
import { useGlobalState, useReloadChapterData } from './GlobalStateContext';

type TransformStateObject = {
  scale: number;
  position_x: number; // Change from positionX to position_x
  position_y: number; // Change from positionY to position_y
};

interface props {
  battlemap: string;
};


interface TransformStateProps {
  transformStateRef: React.MutableRefObject<TransformStateObject | null>;
}

const TransformState = ({transformStateRef}: TransformStateProps) => {
  const transformedComponent = useTransformComponent(({ state, instance }) => {
    if (transformStateRef.current){
      transformStateRef.current.position_x = state.positionX; // Update the field names
      transformStateRef.current.position_y = state.positionY; // Update the field names
      transformStateRef.current.scale = state.scale;
    }
    
    return null;
  });

  return transformedComponent;
};

function IconEditor({battlemap}: props) {
  const [iconImage, setIconImage] = useState("");
  const transformStateRef = useRef<TransformStateObject>({
    scale: 1, // Initial scale
    position_x: 0, // Initial X position
    position_y: 0, // Initial Y position
  });
  const [allegiance, setAllegiance] = useState("neutral");
  const { chapterId } = useGlobalState();
  const reloadChapterData = useReloadChapterData();

  const handleCreateEntity = () => {
    try {
      invoke<string>('upload_icon_image')
        .then((filename) => {
          console.log(filename);
          setIconImage(filename);
        });
    } catch (err) {
      console.log(err);
      setIconImage("");
    }
  };

  const handleSaveClick = () => {
    invoke('add_entity', {
      chapterId: chapterId,
      battlemapId: battlemap,
      imageFilename: iconImage,
      allegiance: allegiance,
      entitySize: 'small',
      transformState: transformStateRef.current})
        .then((response) => {
          console.log(response);
          reloadChapterData();
        })
  }

  const handleAllegianceClick = (allegiance: string) => {
    setAllegiance(allegiance);
  }

  return (
    <div className="icon-editor">
      <div className="panner-container">
        <div className="panner">
          {iconImage === "" ? (
            <p className="create-entity" onClick={handleCreateEntity}>Create Entity</p>
          ) : (
            <>
                <TransformWrapper limitToBounds={false} panning={{ velocityDisabled: true }}>
                  <TransformState transformStateRef={transformStateRef} />
                  <TransformComponent>
                      <img src={`../tableau/assets/iconimages/${iconImage}`} alt="" className="icon-image" />
                  </TransformComponent>
                </TransformWrapper>
                <img src={`/assets/hex-overlay-${allegiance}.png`} alt="" className="hex-overlay" />
                {/* <div className="bounding-box"></div> */}
            </>
          )}
          
        </div>
      </div>

      <div className="editor-controls-container">
        <div className="editor-controls-inner-container">
          <div className="editor-controls">
            <div className="hex-small">Hex Small</div>
            <div className="hex-large">Hex Large</div>
            <div className="allegiance">
              <div className="neutral" onClick={() => handleAllegianceClick('neutral')}>Neutral</div>
              <div className="evil" onClick={() => handleAllegianceClick('evil')}>Evil</div>
            </div>
          </div>
          <div className="alt-controls-container">
            <div className="alt-controls-inner-container">
              <div className="alt-controls" onClick={() => setIconImage("")}>Reset</div>
              <div className="alt-controls"onClick={handleSaveClick}>Save</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IconEditor;
