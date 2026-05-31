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

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const AUDIO_MIMES = ["audio/wav", "audio/mp4", "audio/mpeg", "audio/webm", "audio/x-m4a", "audio/aac", "video/webm", "application/octet-stream"];

function createFilteredUpload(fieldName: string, allowedMimes: string[]) {
  const multerMiddleware = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type`));
      }
    },
  }).single(fieldName);

  return async function (req: Request, res: Response, next: NextFunction) {
    multerMiddleware(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next();

      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(req.file.buffer);

      if (detected && !allowedMimes.includes(detected.mime)) {
        res.status(400).json({ error: "File content does not match an allowed type" });
        return;
      }

      next();
    });
  };
}

export const uploadSingle = createFilteredUpload("file", ALLOWED_MIMES);
export const uploadImage = createFilteredUpload("image", IMAGE_MIMES);
export const uploadAudio = createFilteredUpload("audio", AUDIO_MIMES);

const imagesMulter = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
}).array("photos", 2);

export async function uploadImages(req: Request, res: Response, next: NextFunction) {
  imagesMulter(req, res, async (err) => {
    if (err) return next(err);
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) return next();

    const { fileTypeFromBuffer } = await import("file-type");
    for (const file of files) {
      const detected = await fileTypeFromBuffer(file.buffer);
      if (detected && !IMAGE_MIMES.includes(detected.mime)) {
        res.status(400).json({ error: "File content does not match an allowed type" });
        return;
      }
    }
    next();
  });
}
