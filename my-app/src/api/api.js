// const BASE_URL = "http://localhost:3000";

// export async function apiGet(endpoint) {

//   const response = await fetch(
//     `${BASE_URL}${endpoint}`
//   );

//   if (!response.ok) {
//     throw new Error("GET failed");
//   }

//   return response.json();
// }

// export async function apiPost(endpoint, body) {

//   const response = await fetch(
//     `${BASE_URL}${endpoint}`,
//     {
//       method: "POST",

//       headers: {
//         "Content-Type": "application/json",
//       },

//       body: JSON.stringify(body),
//     }
//   );

//   if (!response.ok) {
//     throw new Error("POST failed");
//   }

//   return response.json();
// }

// export async function apiPut(endpoint, body) {

//   const response = await fetch(
//     `${BASE_URL}${endpoint}`,
//     {
//       method: "PUT",

//       headers: {
//         "Content-Type": "application/json",
//       },

//       body: JSON.stringify(body),
//     }
//   );

//   if (!response.ok) {
//     throw new Error("PUT failed");
//   }

//   return response.json();
// }

// export async function apiDelete(endpoint) {

//   const response = await fetch(
//     `${BASE_URL}${endpoint}`,
//     {
//       method: "DELETE",
//     }
//   );

//   if (!response.ok) {
//     throw new Error("DELETE failed");
//   }
// }

const BASE_URL = "http://localhost:3000";

const cache = {};

// Tell the server who the active user is, so it can enforce ownership
// (a user may only edit/delete their own posts & comments).
function authHeaders() {
  const u = JSON.parse(
    localStorage.getItem("currentUser") || "null"
  );
  return u ? { "x-user-id": u.id } : {};
}

export async function apiGet(endpoint) {

  if (cache[endpoint]) {
    return cache[endpoint];
  }

  const response = await fetch(
    `${BASE_URL}${endpoint}`
  );

  if (!response.ok) {
    throw new Error("GET failed");
  }

  const data = await response.json();

  cache[endpoint] = data;

  return data;
}

export async function apiPost(endpoint, body) {

  const response = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },

      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "POST failed");
  }

  Object.keys(cache).forEach((key) => {

    if (key.startsWith(endpoint)) {
      delete cache[key];
    }
  });

  return response.json();
}

export async function apiPut(endpoint, body) {

  const response = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },

      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "PUT failed");
  }

  Object.keys(cache).forEach((key) => {

    if (key.startsWith(`/${endpoint.split("/")[1]}`)){
      delete cache[key];
    }
  });

  return response.json();
}

export async function apiDelete(endpoint) {

  const response = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      method: "DELETE",
      headers: {
        ...authHeaders(),
      },
    }
  );

  if (!response.ok) {
    throw new Error("DELETE failed");
  }

  Object.keys(cache).forEach((key) => {

    if (key.startsWith(`/${endpoint.split("/")[1]}`)) {
      delete cache[key];
    }
  });
}