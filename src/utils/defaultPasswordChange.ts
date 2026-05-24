const DEFAULT_PASSWORD_CHANGE_KEY_PREFIX = 'turuturustars.defaultPasswordChange.';

export const defaultPasswordChangeKey = (userId: string) => `${DEFAULT_PASSWORD_CHANGE_KEY_PREFIX}${userId}`;

export const markDefaultPasswordChangeRequired = (userId: string) => {
  window.localStorage.setItem(defaultPasswordChangeKey(userId), 'true');
};

export const isDefaultPasswordChangeRequired = (userId: string) =>
  window.localStorage.getItem(defaultPasswordChangeKey(userId)) === 'true';

export const clearDefaultPasswordChangeRequired = (userId: string) => {
  window.localStorage.removeItem(defaultPasswordChangeKey(userId));
};
