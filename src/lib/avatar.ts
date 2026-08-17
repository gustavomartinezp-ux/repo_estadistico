const AVATAR_GRADIENTS = [
  "from-primary-500 to-primary-600",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-500 to-violet-600",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-cyan-600",
  "from-rose-400 to-pink-600",
] as const;

/** Degradé determinístico según el nombre (mismo nombre = mismo color siempre, sin estado). */
export function avatarGradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
