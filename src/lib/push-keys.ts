import { createECDH } from "node:crypto";

/**
 * web-push only accepts an https: URL or a mailto: address. A bare email is a
 * common paste, so it is normalized instead of silently failing every send.
 */
export function normalizeVapidSubject(subject?: string): string {
  const value = (subject ?? "").trim();

  if (!value) {
    return "";
  }

  if (/^mailto:/i.test(value) || /^https:\/\//i.test(value)) {
    return value;
  }

  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    return `mailto:${value}`;
  }

  return value;
}

export function vapidSubjectValid(subject?: string): boolean {
  const value = normalizeVapidSubject(subject);

  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "mailto:" || url.protocol === "https:";
  } catch {
    return false;
  }
}


function decodeBase64Url(value: string): Buffer {
  try {
    return Buffer.from(value.trim(), "base64url");
  } catch {
    return Buffer.alloc(0);
  }
}

/**
 * A VAPID public key is one uncompressed P-256 point (65 bytes, leading 0x04)
 * and the private key is its 32-byte scalar. Deriving the public key from the
 * private one is the only honest way to say the pair matches.
 */
export function vapidKeyPairValid(
  publicKey?: string,
  privateKey?: string
): boolean {
  if (!publicKey || !privateKey) {
    return false;
  }

  const publicBytes = decodeBase64Url(publicKey);
  const privateBytes = decodeBase64Url(privateKey);

  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    return false;
  }

  if (privateBytes.length !== 32) {
    return false;
  }

  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(privateBytes);
    return ecdh.getPublicKey().equals(publicBytes);
  } catch {
    return false;
  }
}
