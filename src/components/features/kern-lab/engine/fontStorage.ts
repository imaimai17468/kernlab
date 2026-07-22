// IndexedDB persistence for custom fonts. Every operation is bounded by the
// spec's 5s settle rule: a hung request rejects instead of stranding the
// intake machine. Records are keyed by family name — a same-name replacement
// overwrites the record (spec: persistOk).

type StoredFont = {
  name: string;
  bytes: ArrayBuffer;
  addedAt: number;
};

const DB_NAME = "kernlab";
const STORE = "custom-fonts";
const DB_VERSION = 1;

const STORAGE_SETTLE_TIMEOUT_MS = 5000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("IndexedDB request timed out"));
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(
          reason instanceof Error
            ? reason
            : new Error("IndexedDB request failed")
        );
      }
    );
  });
}

const canUseStorage = (): boolean =>
  typeof indexedDB !== "undefined" && indexedDB !== null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "name" });
      }
    });
    request.addEventListener("success", () => {
      resolve(request.result);
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("IndexedDB open failed"));
    });
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => {
      resolve(request.result);
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    });
  });
}

// Bounded open that never leaks the handle: when the deadline wins, a
// late-resolving open() is closed on arrival instead of being orphaned.
function openDbBounded(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("IndexedDB open timed out"));
    }, STORAGE_SETTLE_TIMEOUT_MS);
    openDb().then(
      (db) => {
        if (timedOut) {
          db.close();
          return;
        }
        clearTimeout(timer);
        resolve(db);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        if (!timedOut) {
          reject(
            reason instanceof Error
              ? reason
              : new Error("IndexedDB open failed")
          );
        }
      }
    );
  });
}

// The 5s deadline bounds the CALLER's wait, not the background work:
// db.close() does not abort an in-flight transaction — it only blocks new
// ones and releases the connection once pending work settles (IndexedDB
// spec). The finally guarantees close is requested even when the deadline
// wins, so no code path orphans an open handle.
async function inStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDbBounded();
  try {
    return await withTimeout(
      requestToPromise(work(db.transaction(STORE, mode).objectStore(STORE))),
      STORAGE_SETTLE_TIMEOUT_MS
    );
  } finally {
    db.close();
  }
}

/** Persist (or overwrite) a font record. Rejects on failure or 5s timeout. */
export function putStoredFont(record: StoredFont): Promise<void> {
  if (!canUseStorage())
    return Promise.reject(new Error("IndexedDB unavailable"));
  return inStore("readwrite", (store) => store.put(record)).then(
    () => undefined
  );
}

/** Delete a font record (resolves even when no record exists). */
export function deleteStoredFont(name: string): Promise<void> {
  if (!canUseStorage())
    return Promise.reject(new Error("IndexedDB unavailable"));
  return inStore("readwrite", (store) => store.delete(name)).then(
    () => undefined
  );
}

/** All persisted font records; empty when storage is unavailable or empty. */
export function getAllStoredFonts(): Promise<StoredFont[]> {
  if (!canUseStorage()) return Promise.resolve([]);
  return inStore("readonly", (store) => store.getAll()).catch(() => []);
}
