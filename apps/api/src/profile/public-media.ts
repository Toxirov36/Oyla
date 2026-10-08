export const photoSelect = { id: true } as const;
type MediaUser = {
  avatar?: { id: string; name: string; imageUrl: string } | null;
  photo?: { id: string } | null;
};
export function mediaAvatar(user: MediaUser) {
  return user.photo
    ? {
        id: user.photo.id,
        name: 'Profil rasmi',
        imageUrl: `/api/v1/profile-photos/${user.photo.id}`,
      }
    : (user.avatar ?? null);
}
export function publicMedia<T extends MediaUser>(user: T) {
  const { photo, avatar, ...safe } = user;
  return { ...safe, avatar: mediaAvatar({ photo, avatar }) };
}
