import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";

export default function CaptureControls() {
  const { gl, scene, camera } = useThree();

  const views = [
    { position: [-50, 0, 0], up: [0, 1, 0], name: "Vista Derecha" },
    { position: [50, 0, 0], up: [0, 1, 0], name: "Vista Izquierda" },
    { position: [0, 0, 50], up: [0, 1, 0], name: "Vista Trasera" },
    { position: [0, 0, -50], up: [0, 1, 0], name: "Vista Frontal" },
    { position: [0, 50, 0], up: [0, 0, 1], name: "Vista Superior" },
  ];

  const capturarVista = (view) => {
    camera.position.set(...view.position);
    camera.up.set(...view.up);
    camera.lookAt(0, 0, 0);
    gl.render(scene, camera);

    const link = document.createElement("a");
    link.download = `${view.name}.png`;
    link.href = gl.domElement.toDataURL("image/png");
    link.click();
  };

  return (
    <group>
      <Html position={[0, 0, 0]}>
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            backgroundColor: "rgba(255,255,255,0.8)",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          {views.map((view) => (
            <button
              key={view.name}
              onClick={() => capturarVista(view)}
              style={{
                margin: "5px",
                padding: "8px",
                cursor: "pointer",
              }}
            >
              {view.name}
            </button>
          ))}
        </div>
      </Html>
    </group>
  );
}
