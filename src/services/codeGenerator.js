const CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Encodes a unique numeric ID as base62. Unique IDs => no collisions, no retries.
function encode(num) {
  let n = BigInt(num);
  if (n === 0n) return "0";
  let s = "";
  while (n > 0n) {
    s = CHARS[Number(n % 62n)] + s;
    n /= 62n;
  }
  return s;
}

function decode(str) {
  let n = 0n;
  for (const ch of str) {
    const i = CHARS.indexOf(ch);
    if (i === -1) throw new Error("Invalid base62 character");
    n = n * 62n + BigInt(i);
  }
  return n;
}

module.exports = { encode, decode };
