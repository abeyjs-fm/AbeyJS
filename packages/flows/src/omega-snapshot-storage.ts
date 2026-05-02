import type { OmegaAppSnapshot } from "./omega-flow-snapshot.js";

/** Optional contract to save and load {@link OmegaAppSnapshot} (disk, backend, etc.). */
export interface OmegaSnapshotStorage {
  save(snapshot: OmegaAppSnapshot): Promise<void>;
  load(): Promise<OmegaAppSnapshot | null>;
}
