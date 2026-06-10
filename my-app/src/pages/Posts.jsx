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

  const [postOwner, setPostOwner] = useState(null); // New state for post owner

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

  // const [users, setUsers] =
  //   useState([]);

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
    // const usersData = await apiGet("/users");
    // setUsers(usersData);
  }

  // ======================
  // SELECT POST
  // ======================

  async function selectPost(post) {

    // if (selectedPost?.id === post.id) {
    //   setSelectedPost(null);
    //   setComments([]);
    //   return;} 

    setSelectedPost(post);

    const owner = await apiGet(`/users?id=${post.userId}`);

    setPostOwner(owner[0]);

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

      const updatedPost = {

        ...editingPost,

        title: postTitle,

        body: postBody,
      };

      await apiPut(
        `/posts/${editingPost.id}`,
        updatedPost
      );

    } else {

      await apiPost(
        "/posts",
        {
          userId: currentUser.id,
          title: postTitle,
          body: postBody,
        }
      );
    }

    await loadPosts();

    setShowPostModal(false);

    setPostTitle("");

    setPostBody("");

    setEditingPost(null);
  }

  // ======================
  // DELETE POST
  // ======================

  // async function deletePost(id) {

  //   await apiDelete(
  //     `/posts/${id}`
  //   );

  //   setPosts((prev) =>
  //     prev.filter(
  //       (p) => p.id !== id
  //     )
  //   );

  //   if (
  //     selectedPost?.id === id
  //   ) {

  //     setSelectedPost(null);

  //     setComments([]);
  //   }
  // }
  async function deletePost(id) {

    const comments = await apiGet(
      `/comments?postId=${id}`
    );

    await Promise.all(
      comments.map((comment) =>
        apiDelete(
          `/comments/${comment.id}`
        )
      )
    );

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

    await apiPost(
      "/comments",
      comment
    );

    setNewComment("");

    await selectPost(
      selectedPost
    );
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

    const updatedComment = {

      ...editingComment,

      body: commentBody,
    };

    await apiPut(
      `/comments/${editingComment.id}`,
      updatedComment
    );

    await selectPost(
      selectedPost
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

  // const postOwner =
  //   users.find(
  //     (u) =>
  //       u.id ===
  //       selectedPost?.userId
  //   );

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

          {postOwner
            ? `${postOwner.name}'s Post`
            : "Post"}

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