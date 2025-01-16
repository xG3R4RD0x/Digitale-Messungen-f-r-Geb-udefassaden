import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { useLoader } from "@react-three/fiber";
import CaptureControls from "./CaptureControls";

function Model({ path }) {
  const obj = useLoader(OBJLoader, path);
  return <primitive object={obj} />;
}

export default function ModelViewer() {
  return (
    <div style={{ height: "600px", position: "relative" }}>
      <Canvas camera={{ position: [0, 0, 30], fov: 45 }}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Model path="/models/casa.obj" />
        <OrbitControls />

        {/* ✅ Mover los controles dentro del Canvas */}
        <CaptureControls />
      </Canvas>
    </div>
  );
}
