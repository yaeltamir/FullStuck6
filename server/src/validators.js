// Small shared input validators (used by the auth routes and the resource router).
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidUsername = (username) => /^[a-zA-Z0-9_]+$/.test(username);
