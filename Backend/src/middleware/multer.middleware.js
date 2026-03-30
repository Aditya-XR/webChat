import multer from "multer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const uploadDirectory = path.join(os.tmpdir(), "webchat-uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory)
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

export const upload = multer({ 
    storage,
})
