const RESERVED = new Set(["api", "health"]);
const ALIAS_RE = /^[A-Za-z0-9_-]{3,32}$/;

// Returns a normalized URL string, or throws an Error with a user-facing message.
function validateUrl(input, ownHost) {
  if (typeof input !== "string" || input.length === 0 || input.length > 2048) {
    throw new Error("url must be a string up to 2048 characters");
  }
  let u;
  try {
    u = new URL(input);
  } catch {
    throw new Error("url is not a valid URL");
  }
  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("only http and https URLs are allowed");
  }
  if (ownHost && u.host === ownHost) {
    throw new Error("cannot shorten a link to this service (redirect loop)");
  }
  return u.toString();
}

function validateAlias(alias) {
  if (!ALIAS_RE.test(alias)) {
    throw new Error("alias must be 3-32 chars: letters, numbers, - or _");
  }
  if (RESERVED.has(alias.toLowerCase())) throw new Error("alias is reserved");
  return alias;
}

module.exports = { validateUrl, validateAlias };
