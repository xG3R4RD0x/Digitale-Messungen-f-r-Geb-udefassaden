// components/UploadComponent.js

import { useState } from "react";

export default function UploadComponent({ onUpload }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          onUpload(data); // Manejar el resultado de la subida
        });
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Subir</button>
    </div>
  );
}
