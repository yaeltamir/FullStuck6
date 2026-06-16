// File-upload route — POST /upload (a photo from the user's computer) and the
// static /uploads folder that serves the saved files.
import express, { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => cb(null, randomBytes(8).toString('hex') + extname(file.originalname)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },                                        // max 5 MB
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')), // images only
});

router.use('/uploads', express.static('uploads'));          // serve the uploaded files
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });        // short path, not the whole image
});

export default router;
