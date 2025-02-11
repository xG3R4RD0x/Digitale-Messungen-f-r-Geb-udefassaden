// pages/index.js
import UploadComponent from "../components/UploadComponent";
import React from "react";
import ModelViewer from "../components/ModelViewer";

const Home = () => {
  const handleUpload = (data) => {
    console.log("Uploaded files:", data);
  };

  return (
    <div className="min-h-screen bg-gray-500 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Building 3D Reconstruction Tool
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Upload your images to start the 3D reconstruction process.
          </p>
        </div>
        <UploadComponent onUpload={handleUpload} />
      </div>
      <h1>Visor 3D con Captura de Vistas</h1>
      <ModelViewer modelName="Bambo_House" />
    </div>
  );
};

export default Home;
