# Custom fonts (local file / installed font) spec

User-provided fonts enter the tool from a file picker, drag & drop, or the
Local Font Access API (Chromium only). All processing is local to the browser:
parse (opentype.js — .ttf/.otf/.woff; .woff2 is rejected with format guidance
because its decompressor is Node-only), register (`FontFace` +
`document.fonts.add`), persist (IndexedDB), restore on the next visit. Font
bytes never leave the browser — this is the truth condition of the visible
privacy notice.

Controls (selected family/weight/text…) are React state and are NOT persisted:
every page load starts from the built-in defaults. The registry is the single
authority for selectability; a registry entry is created only after its
FontFace is live in document.fonts and removed together with it, so
`registry ⊆ document.fonts` holds in every state. Custom family names are
identity: re-adding a file whose family name matches an existing custom entry
replaces it (deliberate; names are suffixed only against built-in collisions,
at parse time and again at restore time — a built-in added in a later release
must not shadow a stored custom font).

## States

- restoring — page loaded; stored fonts are being re-registered from
  IndexedDB in the background. Built-in fonts are fully usable. Each record's
  re-registration is bounded by a 5s timeout; a timed-out attempt is
  cancelled — its face is added to document.fonts only when FontFace.load
  resolves before the timeout, and a late resolution is discarded (never an
  orphan face).
- idle — no custom-font operation in flight; registry holds 0..n ready fonts.
- parsing — a picked file's bytes are being parsed (opentype.js parse +
  metadata extraction).
- registering — parse succeeded; `FontFace.load()` + `document.fonts.add` +
  registry insertion in flight.
- persisting — the font is already usable (registry + document.fonts hold
  it); the IndexedDB write is in flight. "Persist completed" means the
  IndexedDB transaction committed.
- removing — a removal's IndexedDB record delete is in flight. Occupies the
  same single operation slot as an intake (picks queue; no observable idle).
- errored — the intake failed; a dismissible error message is shown; registry,
  document.fonts and IndexedDB are unchanged from before the pick.

Notices (persistFail's session-only notice, removeFontFail's failure notice)
are UI overlays orthogonal to machine state: they stay visible until
individually dismissed, across any transitions.

Every async step is bounded: parsing, registering, persisting and removing
resolve to their failure branch (parseFail / registerFail / persistFail /
removeFontFail) if they have not settled within 5s, the same bound as restore
records — no state can hold the machine indefinitely.

## Initial state

restoring (transitions to idle immediately when IndexedDB is empty or
unavailable)

## Actions

| action            | from        | to          | requires                                     | ensures                                                                 |
|-------------------|-------------|-------------|----------------------------------------------|-------------------------------------------------------------------------|
| restoreDone       | restoring   | idle        | every stored record re-registered, failed, or timed out (5s each) | unparsable/corrupt records deleted from IndexedDB; failed/timed-out records kept but not registered this session; registered names suffixed against current built-ins |
| pickFile          | idle        | parsing     | file chosen via input or drop                | intake bytes captured; further files append to the queue                 |
| pickLocalFont     | idle        | parsing     | API available + permission granted + chosen  | blob bytes captured (same intake path as a file)                         |
| queuePick         | parsing, registering, persisting, removing, restoring, errored | (unchanged) | file chosen while busy | file appended to the intake queue; current operation unaffected |
| nextQueued        | idle        | parsing     | intake queue is non-empty                    | oldest queued file dequeued; fires automatically and ATOMICALLY with every entry to idle (after persistOk, persistFail, dismissError, restoreDone, removeOk, removeFontFail) — no other action can interleave between entering idle and the dequeue, so idle with a non-empty queue is never observable |
| parseOk           | parsing     | registering | bytes are a parsable font                    | family name + weights extracted from the file; name suffixed if it collides with a built-in name |
| parseFail         | parsing     | errored     | invalid or unsupported bytes (incl. .woff2, rejected with format guidance) | error message shown; no registry/document.fonts/IndexedDB change  |
| registerOk        | registering | persisting  | FontFace.load resolved                       | face in document.fonts; registry entry present; an existing custom entry with the same name is swapped out in the same synchronous step (old face+entry removed and new ones inserted with no await between — the old font stays live until the new one's load has already resolved); if the replaced family is currently selected, the selected weight is re-clamped to the replacement's weight list |
| registerFail      | registering | errored     | FontFace.load rejected                       | the failed NEW font leaves no registry entry and no document.fonts residue; a pre-existing same-name entry is untouched (the old face is only ever removed inside registerOk's swap) |
| persistOk         | persisting  | idle        | IndexedDB write committed (record key = family name; a replacement overwrites the same key) | font restored automatically on future visits |
| persistFail       | persisting  | idle        | IndexedDB write failed or unavailable        | font stays usable this session; session-only notice shown, stating that whatever was previously persisted under this name (if anything) is what future visits will restore |
| dismissError      | errored     | idle        | true                                         | error message cleared                                                    |
| selectCustom      | any         | (unchanged) | family is in the registry                    | controls.family set; weight made valid for that family at the event site |
| setWeight         | any         | (unchanged) | weight valid for the selected family per the merged list | controls.weight set                                          |
| startRemove       | idle        | removing    | family is in the registry                    | its IndexedDB record delete begins (a session-only font with no record skips straight to removeOk) |
| removeOk          | removing    | idle        | record delete succeeded (or no record existed) | registry entry + FontFace removed; if it was selected, controls fall back to the built-in default family with a valid weight |
| removeFontFail    | removing    | idle        | record delete failed or timed out (5s)       | nothing removed (registry, FontFace and record all intact); dismissible notice shown |
| reload            | any         | restoring   | true                                         | controls reset to built-in defaults (controls are not persisted); in-flight intake and queue are lost; a font is recovered iff its IndexedDB transaction committed before unload |

## Invariants

- A family is selectable iff it is a built-in or it is in the registry; every
  registry entry's FontFace is in document.fonts (registry ⊆ document.fonts in
  every state, including restoring — restore inserts the registry entry only
  after its FontFace.load resolves).
- Registry family names are disjoint from built-in family names at all times
  (enforced at parseOk and again at restore registration).
- The selected (family, weight) pair is always renderable: the weight is valid
  for the family per the merged (built-in + registry) list. Reload re-anchors
  this by resetting controls to built-in defaults; same-name replacement
  re-anchors it by re-clamping the selected weight.
- At most one operation occupies parsing/registering/persisting/removing at a
  time; additional picks queue.
- Font bytes are never attached to any network request: parse, register,
  persist and restore are all local operations (privacy-notice truth
  condition).
- A failed intake leaves registry, document.fonts and IndexedDB exactly as
  they were before the pick.
- While an intake is in flight, the canvas and the selection controls (text,
  family, weight, sliders, export) remain fully usable — selectCustom and
  setWeight are enabled from every state. Only custom-font management
  (startRemove) waits for idle; the loading state is local to the intake UI.
- Custom families bypass stylesheet injection in the font loader (they have no
  remote stylesheet); their readiness still flows through the same
  per-character coverage store as built-ins.
- restoring always terminates: every record settles by registration, error, or
  the 5s per-record timeout, so restoreDone's guard is eventually satisfied.

## Forbidden flows

- selectCustom for a family not in the registry (and hence, by the registry
  invariant, for a family whose FontFace is not in document.fonts).
- Two registry entries or two document.fonts faces for the same family name
  (re-adding replaces; the old face is removed before the new one is added).
- Reaching persisting (font usable) without passing parseOk — unparsed bytes
  must never reach document.fonts.
- An errored state with no dismiss path (user trapped).
- A removal that leaves an orphan: a registry entry without its FontFace, a
  FontFace without its registry entry, or an IndexedDB record for a removed
  font.
- The intake queue stalling: after dismissError (or persistOk/persistFail),
  entry to idle auto-fires nextQueued when the queue is non-empty.
- A removed font resurrecting from the intake queue: unreachable because
  nextQueued is atomic with entry to idle — startRemove can only fire in an
  observable idle, which implies an empty queue.
- A restore that destroys data on transient failure: only unparsable/corrupt
  records may be deleted; a timed-out or load-rejected record stays in
  IndexedDB for the next visit.
- An orphan face from a late restore load: a FontFace whose load resolves
  after its record was marked timed-out is discarded, never added to
  document.fonts.

## Requirements

- R1: The user can always recover from errored (dismiss, then pick again).
- R2: A font whose persist completed (IndexedDB transaction committed) is
  never lost silently: its record survives every failed or timed-out restore
  attempt, so it is restored — without re-upload — on the first visit where
  its re-registration succeeds within the timeout. (Eventual selectability:
  a single slow load may degrade one session to built-ins for that font, but
  never deletes it.)
- R3: Persistence failure degrades to session-only use; it never blocks the
  intake or the use of the font.
- R4: Browsers without the Local Font Access API never show the installed-font
  picker (feature detection); the file path is always available.
- R5: SVG export of a custom family embeds glyph outlines (no external font
  reference); built-in families keep the existing @import export.
  *(Out of machine scope: verified by export tests, not by this machine.)*
- R6: The privacy notice (フォントはサーバーに送信されません) is visible at
  the intake UI and is accurate — the bytes-never-leave invariant above is its
  truth condition. *(Notice visibility is out of machine scope: verified by
  UI review, not by this machine.)*
