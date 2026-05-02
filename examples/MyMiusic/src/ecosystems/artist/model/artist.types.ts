export type DeezerArtist = {
  id: number;
  name: string;
  link?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  nb_fan?: number;
  nb_album?: number;
};

export type ArtistQuery = {
  page: number;
  pageSize: number;
  query?: string;
};

export type ArtistPage = {
  items: DeezerArtist[];
  totalItems: number;
  page: number;
  pageSize: number;
  query: string;
};

