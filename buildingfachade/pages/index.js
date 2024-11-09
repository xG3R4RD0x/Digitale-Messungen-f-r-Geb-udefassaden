// pages/index.js
import UploadComponent from "../components/UploadComponent";
import React from "react";

const Home = () => {
  const handleUpload = (data) => {
    console.log("Uploaded files:", data);
  };

  return (
    <div>
      <h1>Building 3D Reconstruction Tool</h1>
      <p>Upload your images to start the 3D reconstruction process.</p>
      <UploadComponent onUpload={handleUpload} />
    </div>
  );
};

export default Home;
