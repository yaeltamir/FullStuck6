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
} from "../api/api";

export default function Posts() {

  const [posts, setPosts] = useState([]);

  const [selectedPost, setSelectedPost] = useState(null);

  const [comments, setComments] = useState([]);

  const [search, setSearch] = useState("");

  const [newComment, setNewComment] =  useState("");


  // ======================
  // POST MODAL
  // ======================

  const [showPostModal,
    setShowPostModal] =
    useState(false);

  const [postTitle,
    setPostTitle] =
    useState("");

  const [postBody,
    setPostBody] =
    useState("");

  const [editingPost,
    setEditingPost] =
    useState(null);

  // ======================
  // COMMENT MODAL
  // ======================

  const [showCommentModal,
    setShowCommentModal] =
    useState(false);

  const [commentBody,
    setCommentBody] =
    useState("");

  const [editingComment,
    setEditingComment] =
    useState(null);

  const currentUser = JSON.parse(
    localStorage.getItem(
      "currentUser"
    )
  );

  useEffect(() => {

    loadPosts();

  }, []);

  // ======================
  // LOAD POSTS
  // ======================

  async function loadPosts() {

    const data = await apiGet("/posts");
    setPosts(data);
  }

  // ======================
  // SELECT POST
  // ======================

  async function selectPost(post) {

    setSelectedPost(post);

    const data = await apiGet(
      `/comments?postId=${post.id}`
    );

    setComments(data);
  }

  // ======================
  // ADD POST
  // ======================

  function addPost() {

    setEditingPost(null);

    setPostTitle("");

    setPostBody("");

    setShowPostModal(true);
  }

  // ======================
  // EDIT POST
  // ======================

  function updatePost(post) {

    setEditingPost(post);

    setPostTitle(post.title);

    setPostBody(post.body);

    setShowPostModal(true);
  }

  // ======================
  // SAVE POST
  // ======================

  async function savePost() {

    if (
      !postTitle.trim() ||
      !postBody.trim()
    ) {
      return;
    }

    if (editingPost) {

      const changedFields = {};

      if (postTitle.trim() !== editingPost.title) {
        changedFields.title = postTitle.trim();
      }

      if (postBody.trim() !== editingPost.body) {
        changedFields.body = postBody.trim();
      }

      if (Object.keys(changedFields).length === 0) {
        setShowPostModal(false);
        return;
      }

      await apiPut(
        `/posts/${editingPost.id}`,
        changedFields
      );

      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? {
                ...p,
                title: postTitle,
                body: postBody,
              }
            : p
        )

      );

    } else {

      const created = await apiPost(
        "/posts",
        {
          userId: currentUser.id,
          title: postTitle,
          body: postBody,
        }
      );

      // append the new post (the server gave us its id)
      setPosts((prev) => [created, ...prev]);
    }

    setShowPostModal(false);

    setPostTitle("");

    setPostBody("");

    setEditingPost(null);
  }

  // ======================
  // DELETE POST
  // ======================

  async function deletePost(id) {

    // The server soft-deletes the post AND its comments (cascade),
    // so the client doesn't touch other users' comments.
    await apiDelete(
      `/posts/${id}`
    );

    setPosts((prev) =>
      prev.filter(
        (p) => p.id !== id
      )
    );

    if (
      selectedPost?.id === id
    ) {

      setSelectedPost(null);

      setComments([]);
    }
  }

  // ======================
  // ADD COMMENT
  // ======================

  async function addComment() {

    if (
      !newComment.trim() ||
      !selectedPost
    ) {
      return;
    }

    const comment = {

      postId:
        selectedPost.id,

      userId:
        currentUser.id,

      name:
        currentUser.name,

      email:
        currentUser.email,

      body:
        newComment,
    };

    const created = await apiPost(
      "/comments",
      comment
    );

    // add the new comment locally (no need to re-fetch them all)
    setComments((prev) => [...prev, created]);

    setNewComment("");
  }

  // ======================
  // EDIT COMMENT
  // ======================

  function updateComment(
    comment
  ) {

    setEditingComment(
      comment
    );

    setCommentBody(
      comment.body
    );

    setShowCommentModal(
      true
    );
  }

  // ======================
  // SAVE COMMENT
  // ======================

  async function saveComment() {

    if (
      !commentBody.trim()
    ) {
      return;
    }

    await apiPut(
      `/comments/${editingComment.id}`,
      {
        body: commentBody
      }
    );

    setComments((prev) =>
      prev.map((c) =>
        c.id === editingComment.id
          ? {
              ...c,
              body: commentBody,
            }
          : c
      )
    );

    setShowCommentModal(
      false
    );

    setCommentBody("");

    setEditingComment(
      null
    );
  }

  // ======================
  // DELETE COMMENT
  // ======================

  async function deleteComment(id) {

    await apiDelete(
      `/comments/${id}`
    );

    setComments((prev) =>
      prev.filter(
        (c) => c.id !== id
      )
    );
  }

  // ======================
  // SEARCH
  // ======================

  const filteredPosts =
    posts.filter((post) => {

      const text =
        search.toLowerCase();

      return (

        post.title
          .toLowerCase()
          .includes(text) ||

        String(post.id)
          .includes(text)
      );
    });

  const myPosts =
    filteredPosts.filter(
      (p) =>
        p.userId ===
        currentUser.id
    );

  const communityPosts =
    filteredPosts.filter(
      (p) =>
        p.userId !==
        currentUser.id
    );

  return (

    <div>

    {!selectedPost && (
        <>
      <h2>
        Posts
      </h2>

        <hr />
          <button
            onClick={addPost}
          >
            Add Post
          </button>
        <hr />

        <input
          placeholder="Search..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />
  
        {/* MY POSTS */}
        <h2>
          My Posts
        </h2>

        {myPosts.map((post) => (

          <div
            key={post.id}
            className="card"
          >

            <div className="item-row">

              <button
                className="item-title-btn"
                onClick={() =>
                  selectPost(post)
                }
              >
                📝 {post.title}
              </button>

              <div className="item-actions">

                <button
                  className="btn-secondary"
                  onClick={() =>
                    updatePost(post)
                  }
                >
                  Edit
                </button>

                <button
                  className="btn-danger"
                  onClick={() =>
                    deletePost(
                      post.id
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

        {/* COMMUNITY POSTS */}

        <h2>
          Community Posts
        </h2>

        {communityPosts.map(
          (post) => (

          <div
            key={post.id}
            className="card"
          >

            <div className="item-row">

              <button
                className="item-title-btn"
                onClick={() =>
                  selectPost(post)
                }
              >
                🌍 {post.title}
              </button>

            </div>

          </div>
        ))}

        <hr />
        </>
      )}

      {/* SELECTED POST */}

      {selectedPost && (

        <div className="card">

          <button
            className="btn-secondary"
            onClick={() =>
              setSelectedPost(null)
            }
          >
            ← Back to Posts
          </button>
          <h3>
            {selectedPost.ownerName}'s Post
          </h3>
          <br />
          <hr />
          <h2>
            {
              selectedPost.title
            }
          </h2>

          <p>
            {
              selectedPost.body
            }
          </p>

          <hr />

          <h3>
            Comments
          </h3>

          <input
            placeholder="
              Add comment...
            "
            value={newComment}
            onChange={(e) =>
              setNewComment(
                e.target.value
              )
            }
          />

          <button
            onClick={addComment}
          >
            Add Comment
          </button>

          <br />
          <br />

          {comments.map(
            (comment) => (

            <div
              key={comment.id}
              className="card"
            >

              <p>
                <b>
                  {comment.name}
                </b>
              </p>

              <p>
                {comment.body}
              </p>

              {comment.userId ===
                currentUser.id && (

                <>

                  <button className="btn-secondary"
                    onClick={() =>
                      updateComment(
                        comment
                      )
                    }
                  >
                    Edit
                  </button>

                  <button className="btn-danger"
                    onClick={() =>
                      deleteComment(
                        comment.id
                      )
                    }
                  >
                    Delete
                  </button>

                </>
              )}

            </div>
          ))}

        </div>
      )}

      {/* ====================== */}
      {/* POST MODAL */}
      {/* ====================== */}

      <Modal
        isOpen={
          showPostModal
        }
        onClose={() =>
          setShowPostModal(
            false
          )
        }
      >

        <h2>
          {editingPost
            ? "Edit Post"
            : "Add Post"}
        </h2>

        <input
          value={postTitle}
          onChange={(e) =>
            setPostTitle(
              e.target.value
            )
          }
          placeholder="
            Post title
          "
        />

        <br />
        <br />

        <textarea
          value={postBody}
          onChange={(e) =>
            setPostBody(
              e.target.value
            )
          }
          placeholder="
            Post body
          "
        />

        <br />
        <br />

        <button
          onClick={savePost}
        >
          Save
        </button>

      </Modal>

      {/* ====================== */}
      {/* COMMENT MODAL */}
      {/* ====================== */}

      <Modal
        isOpen={
          showCommentModal
        }
        onClose={() =>
          setShowCommentModal(
            false
          )
        }
      >

        <h2>
          Edit Comment
        </h2>

        <textarea
          value={commentBody}
          onChange={(e) =>
            setCommentBody(
              e.target.value
            )
          }
          placeholder="
            Comment
          "
        />

        <br />
        <br />

        <button
          onClick={saveComment}
        >
          Save
        </button>

      </Modal>

    </div>
  );
}