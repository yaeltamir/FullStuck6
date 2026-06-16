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

// Send the signed JWT so the server can verify WHO we are. The server reads
// permissions from the DB by this id — it never trusts the client's claims.
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

// Upload an image file to the server; returns the full URL to use as a photo.
export async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file);
  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { ...authHeaders() },   // no Content-Type — the browser sets the multipart boundary
    body: form,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Upload failed");
  }
  const data = await response.json();
  return `${BASE_URL}${data.url}`;   // e.g. http://localhost:3000/uploads/ab12.jpg
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