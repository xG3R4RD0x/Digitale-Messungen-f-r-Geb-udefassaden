import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";

import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";
import { useRef, useState } from "react";

function Model({ path }) {
  const obj = useLoader(OBJLoader, path);

  obj.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: "#cccccc",
        flatShading: true,
        metalness: 0.1,
        roughness: 0.8,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return <primitive object={obj} />;
}

// Rotation Controls
function RotationControls({ cameraRef, modelRef }) {
  // const { gl, scene, camera } = useThree();

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

function CaptureView({ gl, scene, camera }) {
  const capturarImagen = () => {
    if (gl && scene && camera) {
      gl.render(scene, camera);
      const link = document.createElement("a");
      link.download = `captura.png`;
      link.href = gl.domElement.toDataURL("image/png");
      link.click();
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

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="bg-white"
        style={{ height: "300px", width: "400px", position: "relative" }} // Ajusta el tamaño del Canvas aquí
      >
        {/* Aquí se ve el objeto 3d en la ventana */}
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
            <Model path="/models/casa.obj" />
          </group>
          <OrbitControls />
        </Canvas>
      </div>
      {/* Rotation Controls */}
      <RotationControls cameraRef={cameraRef} modelRef={modelRef} />
      {gl && scene && camera && (
        <CaptureView gl={gl} scene={scene} camera={camera} />
      )}
    </div>
  );
}
