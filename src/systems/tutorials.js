// tutorials.js — which first-time "How to play" cards a kid has already seen (PURE LOGIC).
// Kept in the settings store under `seenTutorials` (store = { load, save }, save.js).

/** Has this tutorial been seen already? */
export function tutorialSeen(id, store) {
  try {
    return Boolean(store.load()?.seenTutorials?.[id]);
  } catch {
    return false;
  }
}

/** Remember that it was seen. */
export function markTutorialSeen(id, store) {
  try {
    const seen = store.load()?.seenTutorials ?? {};
    store.save({ seenTutorials: { ...seen, [id]: true } });
  } catch {
    // storage blocked: the card may simply show again next time
  }
}
