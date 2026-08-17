import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sesión de administrador simple: un token firmado con HMAC (sin librerías
 * externas), guardado en una cookie httpOnly. Un único "perfil admin" (no
 * hay base de datos de usuarios) protege exclusivamente /cargar y su API;
 * el dashboard (/ y /api/atenciones) queda siempre abierto.
 */
export const SESSION_COOKIE = "das_admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Falta SESSION_SECRET en las variables de entorno (ver .env.local.example)."
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const payload = JSON.stringify({ role: "admin", exp: Date.now() + SESSION_DURATION_MS });
  const payloadB64 = Buffer.from(payload, "utf-8").toString("base64url");
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("Falta ADMIN_PASSWORD en las variables de entorno (ver .env.local.example).");
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // Buffers de distinto largo igual deben compararse en tiempo constante:
  // comparamos contra un buffer del mismo largo que "a" para no filtrar por
  // early-return de longitud, y además exigimos que los largos coincidan.
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}
