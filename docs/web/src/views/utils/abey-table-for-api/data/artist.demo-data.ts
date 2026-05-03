import type { ArtistPage, DeezerArtist } from "../model/artist.types.js";

/** Tiny SVG avatar (no outbound request) so the demo row template still shows an image. */
function demoAvatar(seed: number): string {
  const hue = seed % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="hsl(${hue} 52% 42%)"/><text x="16" y="20" font-size="11" text-anchor="middle" fill="white" font-family="system-ui,sans-serif">${String(seed % 97)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Fixed catalog shipped with the docs site when prod has no Deezer relay (CORS-safe). */
const DEMO_ARTISTS: DeezerArtist[] = [
  { id: 9001, name: "Studio North", nb_fan: 8420, nb_album: 3, link: "https://deezer.com" },
  { id: 9002, name: "Arcade Echo", nb_fan: 12033, nb_album: 5, link: "https://deezer.com" },
  { id: 9003, name: "Violet Meridian", nb_fan: 5661, nb_album: 2, link: "https://deezer.com" },
  { id: 9004, name: "Low Orbit Chorus", nb_fan: 24011, nb_album: 7, link: "https://deezer.com" },
  { id: 9005, name: "Paper Moon Duo", nb_fan: 3890, nb_album: 4, link: "https://deezer.com" },
  { id: 9006, name: "Quartz Harbor", nb_fan: 15302, nb_album: 6, link: "https://deezer.com" },
  { id: 9007, name: "Neon Lattice", nb_fan: 9821, nb_album: 3, link: "https://deezer.com" },
  { id: 9008, name: "Tide Lantern", nb_fan: 6733, nb_album: 2, link: "https://deezer.com" },
  { id: 9009, name: "Kite Geography", nb_fan: 4477, nb_album: 1, link: "https://deezer.com" },
  { id: 9010, name: "Sable Transit", nb_fan: 29100, nb_album: 9, link: "https://deezer.com" },
  { id: 9011, name: "Halo Weld", nb_fan: 7144, nb_album: 3, link: "https://deezer.com" },
  { id: 9012, name: "Marrow Clock", nb_fan: 5199, nb_album: 2, link: "https://deezer.com" },
  { id: 9013, name: "Soft Focus Union", nb_fan: 33122, nb_album: 8, link: "https://deezer.com" },
  { id: 9014, name: "Ridge Signal", nb_fan: 8922, nb_album: 4, link: "https://deezer.com" },
  { id: 9015, name: "Comet Receipt", nb_fan: 6621, nb_album: 2, link: "https://deezer.com" },
  { id: 9016, name: "Brass Atlas", nb_fan: 4411, nb_album: 3, link: "https://deezer.com" },
  { id: 9017, name: "Field Notes Trio", nb_fan: 22880, nb_album: 5, link: "https://deezer.com" },
  { id: 9018, name: "Window Seat", nb_fan: 1555, nb_album: 1, link: "https://deezer.com" },
  { id: 9019, name: "Open Circuit", nb_fan: 19940, nb_album: 6, link: "https://deezer.com" },
  { id: 9020, name: "Marble Chorus", nb_fan: 7344, nb_album: 4, link: "https://deezer.com" },
  { id: 9021, name: "Drift Almanac", nb_fan: 5120, nb_album: 3, link: "https://deezer.com" },
  { id: 9022, name: "Porch Light", nb_fan: 8844, nb_album: 2, link: "https://deezer.com" },
  { id: 9023, name: "Vector Lullaby", nb_fan: 17660, nb_album: 5, link: "https://deezer.com" },
  { id: 9024, name: "Wicker Satellite", nb_fan: 9933, nb_album: 3, link: "https://deezer.com" },
].map((a) => ({
  ...a,
  picture_small: demoAvatar(a.id),
}));

/**
 * Synthetic paging over **`DEMO_ARTISTS`** — mirrors **`DeezerArtistRepo.page`** when the relay is absent.
 */
export function paginateOfflineDemoCatalog(input: {
  page: number;
  pageSize: number;
  query?: string;
}): ArtistPage {
  const pageSize = Math.max(1, Math.floor(Number(input.pageSize ?? 10)));
  const page = Math.max(1, Math.floor(Number(input.page ?? 1)));
  const query = String(input.query ?? "").trim().toLowerCase();

  let pool = DEMO_ARTISTS;
  if (query.length > 0) {
    pool = pool.filter((a) => a.name.toLowerCase().includes(query));
  }

  const totalItems = pool.length;
  const index = (page - 1) * pageSize;
  const items = pool.slice(index, index + pageSize);

  return {
    items,
    totalItems,
    page,
    pageSize,
    query,
  };
}
