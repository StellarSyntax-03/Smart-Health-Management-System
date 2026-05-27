import multer from "multer";

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

export const uploadSingle = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: JPEG, PNG, WebP, PDF, DOCX"));
    }
  },
}).single("file");
