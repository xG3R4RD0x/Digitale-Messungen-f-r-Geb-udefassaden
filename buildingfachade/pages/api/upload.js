import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = async (req, res) => {
  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "models");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 1024, // 1GB max file size
      multiples: true,
    });

    const parseForm = async (req) => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });
    };

    const { fields, files } = await parseForm(req);

    const modelName = fields?.modelName || "unnamed_model";

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Normalize files data structure
    let filesArray = [];
    if (files.files) {
      // Handle files.files structure
      filesArray = Array.isArray(files.files) ? files.files : [files.files];
    } else {
      // Fallback to handle other structures
      filesArray = Array.isArray(files) ? files : Object.values(files).flat();
    }

    console.log("Files received:", filesArray.length);

    if (filesArray.length === 0) {
      return res.status(400).json({ error: "No files found in upload" });
    }

    // Process uploaded files
    const uploadedFiles = [];
    for (const file of filesArray) {
      try {
        // Ensure file has required properties
        if (!file || !file.filepath) {
          console.error("Invalid file object:", file);
          continue;
        }

        // Get original filename
        const originalFilename =
          file.originalFilename || file.name || "unnamed_file";

        // Create destination path
        const destinationFilename = originalFilename;
        const destinationPath = path.join(uploadDir, destinationFilename);

        console.log(
          `Processing file: ${originalFilename} -> ${destinationPath}`
        );

        // Check if file already exists
        if (fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
        }

        // Move file to final destination
        fs.copyFileSync(file.filepath, destinationPath);
        fs.unlinkSync(file.filepath); // Clean up temp file

        uploadedFiles.push({
          name: destinationFilename,
          path: `/upload/models/${destinationFilename}`,
          type: file.mimetype || "application/octet-stream",
          size: file.size || 0,
        });
      } catch (fileErr) {
        console.error("Error processing file:", fileErr);
      }
    }

    console.log("Successfully processed files:", uploadedFiles.length);

    res.status(200).json({
      success: true,
      modelName,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    res.status(500).json({
      error: "File upload failed",
      details: error.message,
    });
  }
};

export default upload;
