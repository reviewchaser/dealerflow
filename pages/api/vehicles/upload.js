import connectMongo from "@/libs/mongoose";
import formidable from "formidable";
import fs from "fs";
import path from "path";

// Disable body parsing so Next.js doesn't consume the request body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  try {
    // Configure formidable to save files to public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB max file size
      filename: (name, ext, part, form) => {
        // Generate a unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        return `${timestamp}-${randomId}${ext}`;
      },
    });

    // Parse the form data
    const [fields, files] = await form.parse(req);

    // Get the uploaded file
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate the public URL for the uploaded file
    const filename = path.basename(file.filepath);
    const url = `/uploads/${filename}`;

    return res.status(200).json({
      url,
      message: "File uploaded successfully",
      filename: file.originalFilename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
}
