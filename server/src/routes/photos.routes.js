// Photos routes — mounted at /photos (private: only photos in your albums).
import * as q from '../queries.js';
import { resource } from './resource.js';

export default resource({
  list: q.getPhotos, getById: q.getPhotoById, create: q.createPhoto,
  update: q.updatePhoto, remove: q.deletePhoto, owns: q.ownsPhoto, isPrivate: true,
});
