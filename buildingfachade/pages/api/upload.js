// pages/api/upload.js
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = async (req, res) => {
  const form = formidable({
    multiples: true,
    uploadDir: "./public/uploads",
    keepExtensions: true,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Aquí puedes procesar los archivos subidos
    const uploadedFiles = Object.values(files).map((file) => ({
      name: file.originalFilename,
      path: file.filepath,
    }));

    res.status(200).json({ files: uploadedFiles });
  });
};

export default upload;
