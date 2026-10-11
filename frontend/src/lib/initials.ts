/** Up to two initials of a person's name: "Erin Student" -> "ES". */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) return "?";

  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toLocaleUpperCase("pt-BR");
}

export const AVATAR_TONES = ["blue", "coral", "sun", "mint"] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

/** A stable tone for a name, so a person keeps their colour everywhere. */
export function avatarToneFor(name: string): AvatarTone {
  let hash = 0;
  for (const char of name.trim().toLocaleLowerCase("pt-BR")) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
