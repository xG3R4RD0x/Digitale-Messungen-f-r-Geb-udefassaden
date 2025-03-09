import React, { useState } from "react";
import GrabCutComponent from "../components/GrabCutComponent";

const GrabCutDemo = () => {
  const [imageUrl, setImageUrl] = useState(null);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target.result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          GrabCut Demo
        </h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload an image to apply GrabCut:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                     file:rounded-md file:border-0 file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {imageUrl && (
          <div className="border rounded-lg overflow-hidden">
            <GrabCutComponent imageUrl={imageUrl} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GrabCutDemo;
