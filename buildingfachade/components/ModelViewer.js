import { Canvas, useLoader } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three";
import { useRef, useState, useEffect } from "react";

function Model({ objPath, mtlPath }) {
  const materials = useLoader(MTLLoader, mtlPath);
  const obj = useLoader(OBJLoader, objPath, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return <primitive object={obj} />;
}

function RotationControls({ cameraRef, modelRef }) {
  const views = [
    { position: [-30, 0, 0], up: [0, 1, 0], name: "Vista Derecha" },
    { position: [30, 0, 0], up: [0, 1, 0], name: "Vista Izquierda" },
    { position: [0, 0, 30], up: [0, 1, 0], name: "Vista Trasera" },
    { position: [0, 0, -30], up: [0, 1, 0], name: "Vista Frontal" },
    { position: [0, 30, 0], up: [0, 0, 1], name: "Vista Superior" },
  ];

  const rotateModel = (view) => {
    const camera = cameraRef.current;
    const model = modelRef.current;

    if (camera && model) {
      camera.position.set(...view.position);
      camera.up.set(...view.up);
      camera.lookAt(model.position);
    }
  };

  return (
    <div>
      {views.map((view) => (
        <button
          className="btn btn-blue"
          key={view.name}
          onClick={() => rotateModel(view)}
        >
          {view.name}
        </button>
      ))}
    </div>
  );
}

function CaptureView({ gl, scene, camera, setImageUrl }) {
  const capturarImagen = () => {
    if (gl && scene && camera) {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");
      setImageUrl(dataUrl);
    }
  };

  return (
    <button className="btn btn-green" onClick={() => capturarImagen()}>
      Generar Imagen
    </button>
  );
}

export default function ModelViewer() {
  const modelRef = useRef();
  const cameraRef = useRef();
  const [gl, setGl] = useState(null);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="bg-white"
        style={{ height: "300px", width: "400px", position: "relative" }} // Ajusta el tamaño del Canvas aquí
      >
        <Canvas
          camera={{ position: [0, 0, 30], fov: 45 }} // Ajusta la posición de la cámara aquí
          onCreated={({ gl, scene, camera }) => {
            setGl(gl);
            setScene(scene);
            setCamera(camera);
            cameraRef.current = camera;
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 10]}
            intensity={1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <group ref={modelRef}>
            <Model
              objPath="/models/summer-palace-02.obj"
              mtlPath="/models/summer-palace-02.mtl"
            />
          </group>
          <OrbitControls />
        </Canvas>
      </div>
      {/* Rotation Controls */}
      <RotationControls cameraRef={cameraRef} modelRef={modelRef} />
      {gl && scene && camera && (
        <CaptureView
          gl={gl}
          scene={scene}
          camera={camera}
          setImageUrl={setImageUrl}
        />
      )}
      {imageUrl && (
        <div className="mt-4 bg-white">
          <img src={imageUrl} alt="Captura del modelo" />
        </div>
      )}
    </div>
  );
}
