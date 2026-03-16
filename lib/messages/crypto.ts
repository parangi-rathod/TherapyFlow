import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getDerivedKey() {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error(
      "Secure messaging is not configured. Add MESSAGE_ENCRYPTION_KEY.",
    );
  }

  return createHash("sha256").update(secret, "utf8").digest();
}

export function hasMessageEncryptionConfig() {
  return Boolean(process.env.MESSAGE_ENCRYPTION_KEY?.trim());
}

export function encryptMessageBody(value: string) {
  const iv = randomBytes(12);
  const key = getDerivedKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptMessageBody(value: string) {
  const [ivBase64, tagBase64, encryptedBase64] = value.split(".");

  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Stored message payload is invalid.");
  }

  const key = getDerivedKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function buildMessagePreview(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= 140) {
    return normalized;
  }

  return `${normalized.slice(0, 137)}...`;
}
