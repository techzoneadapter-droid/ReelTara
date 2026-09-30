export type Movie = {
  id: string;
  title: string;
  year: number;
  genre: string;
  rating: number;
  poster: string;
  backdrop: string;
  overview: string;
  badge?: string;
  free?: boolean;
  provider?: string;
};
