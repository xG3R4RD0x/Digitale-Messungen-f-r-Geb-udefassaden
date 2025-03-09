// components/UploadComponent.js
import React, { useState } from "react";

const UploadComponent = ({ onUpload }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [modelName, setModelName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);

    // Extract model name from OBJ file
    const objFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".obj")
    );
    if (objFile) {
      // Remove extension to get model name
      const nameWithoutExtension = objFile.name.replace(/\.[^/.]+$/, "");
      setModelName(nameWithoutExtension);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !modelName) {
      setUploadStatus("Please select at least one .obj file");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Uploading files...");

    const formData = new FormData();
    formData.append("modelName", modelName);

    // Append all files
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Upload failed: ${data.error || response.statusText}`);
      }

      console.log("Upload response:", data);

      if (data.success) {
        setUploadStatus("Upload successful!");

        // Pass model name and file info to parent component
        onUpload({
          modelName: modelName,
          files: data.files,
        });
      } else {
        throw new Error("Upload failed: Unexpected response format");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredFilesByType = (type) => {
    return selectedFiles.filter((file) =>
      file.name.toLowerCase().endsWith(`.${type}`)
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Upload 3D Model Files (.obj, .mtl, and textures)
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 
                     file:rounded-full file:border-0 file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
                     cursor-pointer"
          accept=".obj,.mtl,.png,.jpg,.jpeg"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold text-gray-700">Model Name: {modelName}</p>

          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700">OBJ Files:</p>
            <ul className="text-xs list-disc ml-5 text-gray-700">
              {filteredFilesByType("obj").map((file, index) => (
                <li key={`obj-${index}`}>{file.name}</li>
              ))}
            </ul>
          </div>

          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700">MTL Files:</p>
            <ul className="text-xs list-disc ml-5 text-gray-700">
              {filteredFilesByType("mtl").map((file, index) => (
                <li key={`mtl-${index}`}>{file.name}</li>
              ))}
            </ul>
          </div>

          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700">Texture Files:</p>
            <ul className="text-xs list-disc ml-5 text-gray-700">
              {selectedFiles
                .filter((file) => /\.(png|jpe?g)$/i.test(file.name))
                .map((file, index) => (
                  <li key={`tex-${index}`}>{file.name}</li>
                ))}
            </ul>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={isUploading || selectedFiles.length === 0}
        className={`w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
          isUploading || selectedFiles.length === 0
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
      >
        {isUploading ? "Uploading..." : "Upload 3D Model"}
      </button>

      {uploadStatus && (
        <p
          className={`mt-2 text-sm ${
            uploadStatus.includes("Error") ? "text-red-500" : "text-green-500"
          }`}
        >
          {uploadStatus}
        </p>
      )}
    </div>
  );
};

export default UploadComponent;
