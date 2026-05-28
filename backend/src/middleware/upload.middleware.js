import multer from "multer";
import path   from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve uploads directory — works both in dev and inside packaged Electron app
const uploadsDir = process.env.UPLOADS_DIR
  || path.join(__dirname, "../../../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, `${uuid()}.jpg`),
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only images are allowed"), false);
};

const upload = multer({ storage, fileFilter });

export { uploadsDir };
export default upload;
