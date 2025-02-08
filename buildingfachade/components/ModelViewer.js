import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";
import CaptureControls from "./CaptureControls";

function Model({ path }) {
  const obj = useLoader(OBJLoader, path);

  obj.traverse((child) => {
    if (child.isMesh) {
      // Aplicar material con sombreado para destacar detalles
      child.material = new THREE.MeshStandardMaterial({
        color: "#cccccc",
        flatShading: true, // 🔥 Sombreados planos para destacar aristas
        metalness: 0.1,
        roughness: 0.8,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return <primitive object={obj} />;
}

export default function ModelViewer() {
  return (
    <div style={{ height: "600px", position: "relative" }}>
      <Canvas camera={{ position: [0, 0, 40], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* <directionalLight
          position={[-5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        /> */}
        {/* <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        /> */}
        {/* <directionalLight
          position={[5, 5, -5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        /> */}

        <group>
          <Model path="/models/casa.obj" />
        </group>

        {/* Controles de órbita para mover la cámara */}
        <OrbitControls />

        {/* Botones de captura */}
        <CaptureControls />
      </Canvas>
    </div>
  );
}
