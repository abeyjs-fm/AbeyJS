export type MusicTrackRow = {
  id: number;
  /** Posición en el resultado (Deezer `rank`/`position` o índice en la página). */
  rank: number;
  title: string;
  artistName: string;
  artistInitials: string;
  albumTitle: string;
  durationLabel: string;
  link?: string;
  cover_small?: string;
};

export type MusicTrackQuery = {
  page: number;
  pageSize: number;
  query?: string;
};

export type MusicTrackPage = {
  items: MusicTrackRow[];
  totalItems: number;
  page: number;
  pageSize: number;
  query: string;
};
export type DeezerTrackRaw = {
  id: number;
  title?: string;
  link?: string;
  duration?: number;
  rank?: number;
  position?: number;
  artist?: { name?: string };
  album?: { title?: string; cover?: string; cover_small?: string; cover_medium?: string };
};