// pages/api/upload.js
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = (req, res) => {
  const form = new formidable.IncomingForm();
  form.uploadDir = "./public/uploads";
  form.keepExtensions = true;

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Aquí puedes procesar los archivos subidos
    const uploadedFiles = Object.values(files).map((file) => ({
      name: file.name,
      path: file.path,
    }));

    res.status(200).json({ files: uploadedFiles });
  });
};

export default upload;
