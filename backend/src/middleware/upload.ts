import multer from "multer";
import { Request, Response, NextFunction } from "express";

export const REPORT_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
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

export async function uploadSingle(req: Request, res: Response, next: NextFunction) {
  upload(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return next();

    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(req.file.buffer);

    // DOCX and some PDFs may not be detected by magic bytes; allow if multer MIME matched
    if (detected && !ALLOWED_MIMES.includes(detected.mime)) {
      res.status(400).json({ error: "File content does not match an allowed type" });
      return;
    }

    next();
  });
}
