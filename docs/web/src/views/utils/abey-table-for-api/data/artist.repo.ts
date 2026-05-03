import type { OmegaHttp } from "@abeyjs/http";
import type { ArtistPage, ArtistQuery, DeezerArtist } from "../model/artist.types.js";

type DeezerListResponse<T> = { data?: T[]; total?: number; next?: string };

export class DeezerArtistRepo {
  constructor(private readonly http: OmegaHttp) {}

  async page(input: ArtistQuery): Promise<ArtistPage> {
    const pageSize = Math.max(1, Math.floor(Number(input.pageSize ?? 10)));
    const page = Math.max(1, Math.floor(Number(input.page ?? 1)));
    const query = String(input.query ?? "").trim();

    const index = (page - 1) * pageSize;
    const limit = pageSize;

    // NOTE: Deezer `/chart/0/artists` can return empty depending on region/rate limits.
    // For a reliable initial dataset, fall back to a broad search when query is empty.
    const url = `/search/artist?q=${encodeURIComponent(query || "a")}&index=${index}&limit=${limit}`;

    const r = await this.http.getJson<DeezerListResponse<DeezerArtist>>(url);
    const raw = Array.isArray(r.data) ? r.data : [];
    const items = raw.map((a) => {
      const pic =
        (a.picture_small ?? "").trim() ||
        (a.picture_medium ?? "").trim() ||
        (a.picture_big ?? "").trim() ||
        (a.picture ?? "").trim();
      return pic ? { ...a, picture_small: pic } : a;
    });
    const totalItems = typeof r.total === "number" ? r.total : items.length;
    return { items, totalItems, page, pageSize, query };
  }
}

