import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";

import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";
import { useRef } from "react";

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
function RotationControls() {
  // const { gl, scene, camera } = useThree();

  const views = [
    { position: [-50, 0, 0], up: [0, 1, 0], name: "Vista Derecha" },
    { position: [50, 0, 0], up: [0, 1, 0], name: "Vista Izquierda" },
    { position: [0, 0, 50], up: [0, 1, 0], name: "Vista Trasera" },
    { position: [0, 0, -50], up: [0, 1, 0], name: "Vista Frontal" },
    { position: [0, 50, 0], up: [0, 0, 1], name: "Vista Superior" },
  ];

  // const rotateModel = (view) => {
  //   camera.position.set(...view.position);
  //   camera.up.set(...view.up);
  //   camera.lookAt(0, 0, 0);
  //   gl.render(scene, camera);
  // };

  return (
    <div>
      {views.map((view) => (
        <button class="btn btn-blue" key={view.name}>
          {view.name}
        </button>
      ))}
    </div>
  );
}

export default function ModelViewer() {
  const modelRef = useRef();
  const cameraRef = useRef();

  return (
    <div>
      <div
        class="bg-white"
        style={{ height: "240px", width: "426", position: "relative" }}
      >
        {/* Aquí se ve el objeto 3d en la ventana */}
        <Canvas camera={{ position: [0, 0, 25], fov: 45 }} ref={cameraRef}>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[5, 5, 5]}
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
      <RotationControls />
    </div>
  );
}
