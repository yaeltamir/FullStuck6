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

export default function Todos() {

  const [todos, setTodos] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("id");

  // ======================
  // TODO MODAL
  // ======================

  const [showTodoModal,
    setShowTodoModal] =
    useState(false);

  const [todoTitle,
    setTodoTitle] =
    useState("");

  const [editingTodo,
    setEditingTodo] =
    useState(null);

  useEffect(() => {

    const user = JSON.parse(
      localStorage.getItem(
        "currentUser"
      )
    );

    if (!user) return;

    loadTodos(user.id);

  }, []);

  // ======================
  // LOAD TODOS
  // ======================

  async function loadTodos(
    userId
  ) {

    const data = await apiGet(
      `/todos?userId=${userId}`
    );

    setTodos(data);
  }

  // ======================
  // ADD TODO
  // ======================

  function addTodo() {

    setEditingTodo(null);

    setTodoTitle("");

    setShowTodoModal(true);
  }

  // ======================
  // EDIT TODO
  // ======================

  function updateTodo(todo) {

    setEditingTodo(todo);

    setTodoTitle(todo.title);

    setShowTodoModal(true);
  }

  // ======================
  // SAVE TODO
  // ======================

  async function saveTodo() {

    if (!todoTitle.trim()) {
      return;
    }

    const user = JSON.parse(
      localStorage.getItem(
        "currentUser"
      )
    );

    if (editingTodo) {

      const updatedTodo = {

        ...editingTodo,

        title: todoTitle,
      };

      await apiPut(
        `/todos/${editingTodo.id}`,
        updatedTodo
      );

      setTodos((prev) =>
        prev.map((t) =>
          t.id ===
          editingTodo.id
            ? updatedTodo
            : t
        )
      );

    } else {

      const todo = {

        userId: user.id,

        title: todoTitle,

        completed: false,
      };

      const savedTodo =
        await apiPost(
          "/todos",
          todo
        );

      setTodos((prev) => [
        savedTodo,
        ...prev,
      ]);
    }

    setShowTodoModal(false);

    setTodoTitle("");

    setEditingTodo(null);
  }

  // ======================
  // DELETE TODO
  // ======================

  async function deleteTodo(id) {

    await apiDelete(
      `/todos/${id}`
    );

    setTodos((prev) =>
      prev.filter(
        (t) => t.id !== id
      )
    );
  }

  // ======================
  // TOGGLE TODO
  // ======================

  async function toggleTodo(id) {

    const todo = todos.find(
      (t) => t.id === id
    );

    const updatedTodo = {

      ...todo,

      completed:
        !todo.completed,
    };

    await apiPut(
      `/todos/${id}`,
      updatedTodo
    );

    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? updatedTodo
          : t
      )
    );
  }

  // ======================
  // FILTER + SORT
  // ======================

  const processedTodos =
    todos

      .filter((t) =>

        t.title
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||

        String(t.id)
          .includes(search)
      )

      .filter((t) => {

        if (
          filter ===
          "completed"
        ) {
          return t.completed;
        }

        if (
          filter ===
          "active"
        ) {
          return !t.completed;
        }

        return true;
      })

      .sort((a, b) => {

        if (
          sortBy ===
          "title"
        ) {

          return a.title
            .localeCompare(
              b.title
            );
        }

        if (
          sortBy ===
          "status"
        ) {

          return (
            a.completed -
            b.completed
          );
        }

        return a.id - b.id;
      });

  return (

    <div>

      <h2>
        Todos
      </h2>

      <hr />

      {/* ADD */}

      <button
        onClick={addTodo}
      >
        Add Todo
      </button>
      <hr />
      {/* SEARCH */}

      <input
        placeholder="Search..."
        value={search}
        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }
      />

      {/* FILTER */}

      <select
        value={filter}
        onChange={(e) =>
          setFilter(
            e.target.value
          )
        }
      >

        <option value="all">
          All
        </option>

        <option
          value="completed"
        >
          Completed
        </option>

        <option value="active">
          Active
        </option>

      </select>

      {/* SORT */}

      <select
        value={sortBy}
        onChange={(e) =>
          setSortBy(
            e.target.value
          )
        }
      >

        <option value="id">
          ID
        </option>

        <option value="title">
          Title
        </option>

        <option value="status">
          Status
        </option>

      </select>

      <hr />

      {/* TODOS */}

      {processedTodos.map(
        (todo) => (

        <div
          key={todo.id}
          className="card todo-card"
        >

          <div className="todo-left">

            <input
              type="checkbox"
              checked={
                todo.completed
              }
              onChange={() =>
                toggleTodo(
                  todo.id
                )
              }
              className="todo-checkbox"
            />

            <span
              className="todo-title"
              style={{
                textDecoration:
                  todo.completed
                    ? "line-through"
                    : "none",
              }}
            >
              {todo.title}
            </span>

          </div>

          <div className="todo-actions">

            <button
              className="btn-secondary"
              onClick={() =>
                updateTodo(todo)
              }
            >
              Edit
            </button>

            <button
              className="btn-danger"
              onClick={() =>
                deleteTodo(
                  todo.id
                )
              }
            >
              Delete
            </button>

          </div>

        </div>
      ))}

      {/* ====================== */}
      {/* TODO MODAL */}
      {/* ====================== */}

      <Modal
        isOpen={
          showTodoModal
        }
        onClose={() =>
          setShowTodoModal(
            false
          )
        }
      >

        <h2>
          {editingTodo
            ? "Edit Todo"
            : "Add Todo"}
        </h2>

        <input
          value={todoTitle}
          onChange={(e) =>
            setTodoTitle(
              e.target.value
            )
          }
          placeholder="
            Todo title
          "
        />

        <br />
        <br />

        <button
          onClick={saveTodo}
        >
          Save
        </button>

      </Modal>

    </div>
  );
}