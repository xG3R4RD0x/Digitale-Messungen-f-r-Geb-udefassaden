// pages/index.js
import UploadComponent from "../components/UploadComponent";
import React, { useState } from "react";
import ModelViewer from "../components/ModelViewer";

const Home = () => {
  const [uploadedModel, setUploadedModel] = useState(null);
  const [showModelViewer, setShowModelViewer] = useState(false);

  const handleUpload = (data) => {
    console.log("Uploaded model:", data);
    setUploadedModel(data);
    setShowModelViewer(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 mb-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Building 3D Reconstruction Tool
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Upload your 3D model files (.obj, .mtl, and textures) to visualize
            and process them.
          </p>
        </div>
        <UploadComponent onUpload={handleUpload} />
      </div>

      {showModelViewer && uploadedModel && (
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-6">
            3D Model Viewer
          </h2>
          <ModelViewer modelName={uploadedModel.modelName} />
        </div>
      )}
    </div>
  );
};

export default Home;
