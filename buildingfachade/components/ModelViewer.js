import { Canvas, useLoader } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three";
import { useRef, useState, useEffect } from "react";
import ImageMask from "./ImageMask";
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

function RotationControls({ cameraRef, modelRef, setSelectedView }) {
  const views = [
    { position: [-30, 0, 0], up: [0, 1, 0], name: "Right View" },
    { position: [30, 0, 0], up: [0, 1, 0], name: "Left View" },
    { position: [0, 0, 30], up: [0, 1, 0], name: "Rear View" },
    { position: [0, 0, -30], up: [0, 1, 0], name: "Front View" },
    { position: [0, 30, 0], up: [0, 0, 1], name: "Top View" },
  ];

  const rotateModel = (view) => {
    const camera = cameraRef.current;
    const model = modelRef.current;

    if (camera && model) {
      camera.position.set(...view.position);
      camera.up.set(...view.up);
      camera.lookAt(model.position);
      setSelectedView(view.name);
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

function CaptureView({ gl, scene, camera, addImage }) {
  const capturarImagen = () => {
    if (gl && scene && camera) {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");
      addImage(dataUrl);
    }
  };

  return (
    <button className="btn btn-green" onClick={() => capturarImagen()}>
      Generate Image
    </button>
  );
}

export default function ModelViewer({ modelName }) {
  const objPath = `/models/${modelName}.obj`;
  const mtlPath = `/models/${modelName}.mtl`;
  const modelRef = useRef();
  const cameraRef = useRef();
  const [gl, setGl] = useState(null);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedView, setSelectedView] = useState("");

  const addImage = (dataUrl) => {
    const existingImageIndex = images.findIndex(
      (image) => image.view === selectedView
    );
    if (existingImageIndex !== -1) {
      const updatedImages = [...images];
      updatedImages[existingImageIndex] = { url: dataUrl, view: selectedView };
      setImages(updatedImages);
    } else {
      if (images.length < 5) {
        setImages([...images, { url: dataUrl, view: selectedView }]);
      } else {
        alert("Máximo de 5 imágenes alcanzado");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="bg-gray-50 p-4 rounded-2xl shadow-lg mb-2">
        <div
          className="bg-white p-4 shadow-lg"
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
              <Model objPath={objPath} mtlPath={mtlPath} />
            </group>
            <OrbitControls />
          </Canvas>
        </div>
      </div>
      {/* Rotation Controls */}
      <RotationControls
        cameraRef={cameraRef}
        modelRef={modelRef}
        setSelectedView={setSelectedView}
      />
      {gl && scene && camera && (
        <CaptureView
          gl={gl}
          scene={scene}
          camera={camera}
          addImage={addImage}
        />
      )}
      <div className="mt-4 bg-white">
        {images.map((image, index) => (
          <div key={index} className="mb-4">
            <ImageMask
              imageUrl={image.url}
              instanceId={`model-side-${image.view}`}
            />
            <p className="text-sm font-semibold text-gray-700">{image.view}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
