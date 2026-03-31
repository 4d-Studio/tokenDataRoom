const textEncoder = new TextEncoder();

const toBufferSource = (bytes: Uint8Array) => Uint8Array.from(bytes).buffer;

const toBase64 = (bytes: Uint8Array) => {
  let output = "";

  bytes.forEach((byte) => {
    output += String.fromCharCode(byte);
  });

  return btoa(output);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const deriveKey = async (
  password: string,
  salt: Uint8Array,
  pbkdf2Iterations: number,
) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toBufferSource(salt),
      iterations: pbkdf2Iterations,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptFile = async (
  file: File,
  password: string,
  pbkdf2Iterations: number = 250_000,
) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, pbkdf2Iterations);
  const fileBuffer = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    key,
    fileBuffer,
  );

  return {
    encryptedBytes: new Uint8Array(encrypted),
    salt: toBase64(salt),
    iv: toBase64(iv),
    pbkdf2Iterations,
  };
};

export const decryptFile = async ({
  encryptedBytes,
  password,
  salt,
  iv,
  pbkdf2Iterations,
}: {
  encryptedBytes: ArrayBuffer;
  password: string;
  salt: string;
  iv: string;
  pbkdf2Iterations: number;
}) => {
  const key = await deriveKey(password, fromBase64(salt), pbkdf2Iterations);

  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(fromBase64(iv)) },
    key,
    encryptedBytes,
  );
};
