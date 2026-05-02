import type { OmegaHttp } from "@abeyjs/http";
import type { DeezerTrackRaw, MusicTrackPage, MusicTrackQuery, MusicTrackRow } from "../model/track.types.js";

type DeezerListResponse<T> = { data?: T[]; total?: number };

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function mapTrack(t: DeezerTrackRaw, fallbackRank: number): MusicTrackRow {
  const artistName = t.artist?.name ?? "—";
  const compact = artistName.replace(/\s+/g, "");
  const artistInitials = (compact.slice(0, 2) || "—").toUpperCase();
  /** Solo thumbs: evitar `cover` genérico / XL (más peso y mismas filas al repaginar). */
  const cover =
    (t.album?.cover_small ?? "").trim() ||
    (t.album?.cover_medium ?? "").trim();
  const rank =
    typeof t.rank === "number" && Number.isFinite(t.rank)
      ? t.rank
      : typeof t.position === "number" && Number.isFinite(t.position)
        ? t.position
        : fallbackRank;
  return {
    id: t.id,
    rank,
    title: t.title ?? "—",
    artistName,
    artistInitials,
    albumTitle: t.album?.title ?? "—",
    durationLabel: formatDuration(t.duration ?? 0),
    link: t.link,
    cover_small: cover || undefined,
  };
}

export class DeezerTrackRepo {
  constructor(private readonly http: OmegaHttp) {}

  async page(input: MusicTrackQuery): Promise<MusicTrackPage> {
    const pageSize = Math.max(1, Math.floor(Number(input.pageSize ?? 10)));
    const page = Math.max(1, Math.floor(Number(input.page ?? 1)));
    const query = String(input.query ?? "").trim();
    const index = (page - 1) * pageSize;
    const q = query || "a";
    const url = `/search/track?q=${encodeURIComponent(q)}&index=${index}&limit=${pageSize}`;

    const r = await this.http.getJson<DeezerListResponse<DeezerTrackRaw>>(url);
    const raw = Array.isArray(r.data) ? r.data : [];
    const items = raw.map((t, i) => mapTrack(t, index + i + 1));
    const totalItems = typeof r.total === "number" ? r.total : items.length;
    return { items, totalItems, page, pageSize, query };
  }
}
