import {
  useEffect,
  useState,
} from "react";

import Modal from "../pages/Modal";

import {
  apiGet,
  apiPost,
  apiDelete,
  apiPut,
  uploadImage,
} from "../api/api";

export default function Albums() {

  const [albums, setAlbums] =
    useState([]);

  const [photos, setPhotos] =
    useState([]);

  const [selectedAlbum,
    setSelectedAlbum] =
    useState(null);

  const [search, setSearch] =
    useState("");

  // photo pagination — load a few at a time from the server, not all at once
  const PHOTOS_PAGE = 8;
  const [photosOffset, setPhotosOffset] = useState(0);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);

  // ======================
  // ALBUM MODAL
  // ======================

  const [showAlbumModal,
    setShowAlbumModal] =
    useState(false);

  const [albumTitle,
    setAlbumTitle] =
    useState("");

  const [editingAlbum,
    setEditingAlbum] =
    useState(null);

  // ======================
  // PHOTO MODAL
  // ======================

  const [showPhotoModal,
    setShowPhotoModal] =
    useState(false);

  const [photoTitle,
    setPhotoTitle] =
    useState("");

  const [photoUrl,
    setPhotoUrl] =
    useState("");

  const [editingPhoto,
    setEditingPhoto] =
    useState(null);

  const [uploading,
    setUploading] =
    useState(false);

  // Upload a chosen file and fill the URL field with the returned image URL.
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setPhotoUrl(url);
      if (!photoTitle.trim()) setPhotoTitle(file.name);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  const currentUser = JSON.parse(
    localStorage.getItem(
      "currentUser"
    )
  );

  useEffect(() => {

    if (!currentUser) return;

    loadAlbums();

  }, []);

  // ======================
  // LOAD ALBUMS
  // ======================

  async function loadAlbums() {

    const data = await apiGet(
      `/albums?userId=${currentUser.id}`
    );

    setAlbums(data);
  }

  // ======================
  // SELECT ALBUM
  // ======================

  async function selectAlbum(album) {

    if (!album?.id) {
      return;
    }

    setSelectedAlbum(album);

    const data = await apiGet(
      `/photos?albumId=${album.id}&_per_page=${PHOTOS_PAGE}&offset=0`
    );

    setPhotos(data);
    setPhotosOffset(data.length);
    setHasMorePhotos(data.length === PHOTOS_PAGE);

    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });

    }, 100);
  }

  async function loadMorePhotos() {
    const data = await apiGet(
      `/photos?albumId=${selectedAlbum.id}&_per_page=${PHOTOS_PAGE}&offset=${photosOffset}`
    );
    setPhotos((prev) => [...prev, ...data]);
    setPhotosOffset(photosOffset + data.length);
    setHasMorePhotos(data.length === PHOTOS_PAGE);
  }

  // ======================
  // ADD ALBUM
  // ======================

  function addAlbum() {

    setEditingAlbum(null);

    setAlbumTitle("");

    setShowAlbumModal(true);
  }

  // ======================
  // EDIT ALBUM
  // ======================

  function updateAlbum(album) {

    setEditingAlbum(album);

    setAlbumTitle(album.title);

    setShowAlbumModal(true);
  }

  // ======================
  // SAVE ALBUM
  // ======================

  async function saveAlbum() {

    if (!albumTitle.trim()) {
      return;
    }

    if (albumTitle.length < 2) {

      alert(
        "Album title too short"
      );

      return;
    }

    if (editingAlbum) {

      const updatedAlbum = {
        ...editingAlbum,
        title: albumTitle,
      };

      await apiPut(
        `/albums/${editingAlbum.id}`,
        updatedAlbum
      );

      setAlbums((prev) =>
        prev.map((a) =>
          a.id === editingAlbum.id ? updatedAlbum : a
        )
      );

    } else {

      const created = await apiPost(
        "/albums",
        {
          userId: currentUser.id,
          title: albumTitle,
        }
      );

      setAlbums((prev) => [...prev, created]);
    }

    setShowAlbumModal(false);

    setAlbumTitle("");

    setEditingAlbum(null);
  }

  // ======================
  // DELETE ALBUM
  // ======================

  // async function deleteAlbum(id) {

  //   await apiDelete(
  //     `/albums/${id}`
  //   );

  //   setAlbums((prev) =>
  //     prev.filter(
  //       (a) => a.id !== id
  //     )
  //   );

  //   if (
  //     selectedAlbum?.id === id
  //   ) {

  //     setSelectedAlbum(null);

  //     setPhotos([]);
  //   }
  // }
  async function deleteAlbum(id) {

    // the server soft-deletes the album AND its photos (cascade) — one call.
    await apiDelete(
      `/albums/${id}`
    );

    setAlbums((prev) =>
      prev.filter(
        (a) => a.id !== id
      )
    );

    if (
      selectedAlbum?.id === id
    ) {

      setSelectedAlbum(null);

      setPhotos([]);
    }
  }
  // ======================
  // ADD PHOTO
  // ======================

  function addPhoto() {

    if (!selectedAlbum?.id) {
      return;
    }

    setEditingPhoto(null);

    setPhotoTitle("");

    setPhotoUrl("");

    setShowPhotoModal(true);
  }

  // ======================
  // EDIT PHOTO
  // ======================

  function updatePhoto(photo) {

    setEditingPhoto(photo);

    setPhotoTitle(photo.title);

    setPhotoUrl(photo.url);

    setShowPhotoModal(true);
  }

  // ======================
  // SAVE PHOTO
  // ======================

  async function savePhoto() {

    if (!selectedAlbum?.id) {
      return;
    }

    if (
      !photoTitle.trim() ||
      !photoUrl.trim()
    ) {
      return;
    }

    if (
      !photoUrl.startsWith(
        "http"
      )
    ) {

      alert(
        "Invalid URL"
      );

      return;
    }

    if (editingPhoto) {

      const updatedPhoto = {
        ...editingPhoto,
        title: photoTitle,
        url: photoUrl,
        thumbnailUrl: photoUrl,
      };

      await apiPut(
        `/photos/${editingPhoto.id}`,
        updatedPhoto
      );

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === editingPhoto.id ? updatedPhoto : p
        )
      );

    } else {

      const created = await apiPost(
        "/photos",
        {
          albumId: selectedAlbum.id,
          title: photoTitle,
          url: photoUrl,
          thumbnailUrl: photoUrl,
        }
      );

      setPhotos((prev) => [...prev, created]);
    }

    setShowPhotoModal(false);

    setPhotoTitle("");

    setPhotoUrl("");

    setEditingPhoto(null);
  }

  // ======================
  // DELETE PHOTO
  // ======================

  async function deletePhoto(id) {

    await apiDelete(
      `/photos/${id}`
    );

    setPhotos((prev) =>
      prev.filter(
        (p) => p.id !== id
      )
    );
  }

  // ======================
  // SEARCH
  // ======================

  const filteredAlbums =
    albums.filter((album) => {

      const text =
        search.toLowerCase();

      return (

        album.title
          .toLowerCase()
          .includes(text) ||

        String(album.id)
          .includes(text)
      );
    });

  return (

    <div>

      <h2>
        Albums
      </h2>
      <hr />

      <button
        onClick={addAlbum}
      >
        Add Album
      </button>
      <hr />

      <input
        placeholder="
          Search album...
        "
        value={search}
        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }
      />

      {/* ALBUMS */}

      {filteredAlbums.map(
        (album) => (

        <div
          key={album.id}
          className="card"
        >

          <div className="item-row">

            <button
              className="item-title-btn"
              onClick={() =>
                selectAlbum(album)
              }
            >
              📁 {album.title}
            </button>

            <div className="item-actions">

              <button
                className="btn-secondary"
                onClick={() =>
                  updateAlbum(album)
                }
              >
                Edit
              </button>

              <button
                className="btn-danger"
                onClick={() =>
                  deleteAlbum(
                    album.id
                  )
                }
              >
                Delete
              </button>

            </div>

          </div>

        </div>
      ))}

      <hr />

      {/* PHOTOS */}

      {selectedAlbum && (

        <div>

          <h2>
            {
              selectedAlbum.title
            }
          </h2>

          <button
            onClick={addPhoto}
          >
            Add Photo
          </button>

          <div
            className="
              photos-grid
            "
          >

            {photos
              .map((photo) => (

              <div
                key={photo.id}
                className="
                  photo-card
                "
              >

                <img
                  src={
                    photo.thumbnailUrl
                  }
                  alt={
                    photo.title
                  }
                  width="200"
                />

                <p>
                  {photo.title}
                </p>

                <button className="btn-secondary"
                  onClick={() =>
                    updatePhoto(
                      photo
                    )
                  }
                >
                  Edit
                </button>

                <button className="btn-danger"
                  onClick={() =>
                    deletePhoto(
                      photo.id
                    )
                  }
                >
                  Delete
                </button>

              </div>
            ))}

          </div>

          {hasMorePhotos && (
            <button onClick={loadMorePhotos}>
              Load More
            </button>
          )}

        </div>
      )}

      {/* ====================== */}
      {/* ALBUM MODAL */}
      {/* ====================== */}

      <Modal
        isOpen={
          showAlbumModal
        }
        onClose={() =>
          setShowAlbumModal(
            false
          )
        }
      >

        <h2>
          {editingAlbum
            ? "Edit Album"
            : "Add Album"}
        </h2>

        <input
          value={albumTitle}
          onChange={(e) =>
            setAlbumTitle(
              e.target.value
            )
          }
          placeholder="
            Album title
          "
        />

        <button
          onClick={saveAlbum}
        >
          Save
        </button>

      </Modal>

      {/* ====================== */}
      {/* PHOTO MODAL */}
      {/* ====================== */}

      <Modal
        isOpen={
          showPhotoModal
        }
        onClose={() =>
          setShowPhotoModal(
            false
          )
        }
      >

        <h2>
          {editingPhoto
            ? "Edit Photo"
            : "Add Photo"}
        </h2>

        <input
          value={photoTitle}
          onChange={(e) =>
            setPhotoTitle(
              e.target.value
            )
          }
          placeholder="
            Photo title
          "
        />

        <input
          value={photoUrl}
          onChange={(e) =>
            setPhotoUrl(
              e.target.value
            )
          }
          placeholder="
            Photo URL
          "
        />

        <p style={{ margin: "6px 0", color: "var(--muted, #777)" }}>
          — or upload from your computer —
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {uploading && <p>Uploading…</p>}

        {photoUrl && (
          <img
            src={photoUrl}
            alt="preview"
            style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, marginTop: 8 }}
          />
        )}

        <button
          onClick={savePhoto}
          disabled={uploading}
        >
          Save
        </button>

      </Modal>

    </div>
  );
}