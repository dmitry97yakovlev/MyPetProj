import { AVATAR_CHARACTERS, type AvatarCharacter } from "@mypetproj/shared";

/** Резолвит id персонажа (Character.avatarIcon) в каталожную запись, с фолбэком на первого, если id неизвестен (старые эмодзи-значения, битые данные). */
export function getAvatarCharacter(id: string): AvatarCharacter {
  return AVATAR_CHARACTERS.find((c) => c.id === id) ?? AVATAR_CHARACTERS[0];
}
