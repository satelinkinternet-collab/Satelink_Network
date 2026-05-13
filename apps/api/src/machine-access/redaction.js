const SECRET_PATTERNS = [
  /(bearer\s+)[a-z0-9\-_.=]+/gi,
  /(authorization["=: ]+)[^\s",}]+/gi,
  /(token["=: ]+)[^\s",}]+/gi,
  /(secret["=: ]+)[^\s",}]+/gi,
  /(cookie["=: ]+)[^\s",}]+/gi,
];

export function redactText(value) {
  if (!value) return value;
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, (_match, prefix) => `${prefix}[REDACTED]`),
    String(value),
  );
}

export function redactObject(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (/token|secret|authorization|cookie|password/i.test(key)) {
          return [key, "[REDACTED]"];
        }
        return [key, redactObject(entry)];
      }),
    );
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  return value;
}
