export type Country = "IN" | "PH";
export type ContentMode = "free_legal" | "discovery";
export type Genre = { id: number; name: string };
export type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile?: string;
};
export type CrewMember = { id: number; name: string; job: string };
export type Trailer = {
  id: string;
  provider: "youtube" | "direct";
  videoId?: string;
  directPlaybackUrl?: string;
  mimeType?: string;
  sourceName: string;
  sourcePageUrl?: string;
  /** Reviewed authorization for direct sources or non-official fallbacks. */
  verified?: boolean;
  name: string;
  official: boolean;
  type: "Trailer" | "Teaser";
};
export type StreamingProvider = {
  id: number;
  name: string;
  kind: "free" | "ads" | "subscription" | "rent" | "buy";
  url: string;
  country: Country;
  logoUrl?: string;
  destination?: "availability" | "provider";
};
export type FreeSource = {
  sourceName: string;
  sourcePageUrl: string;
  playbackUrl: string;
  fallbackPlaybackUrls: string[];
  licenseType: string;
  licenseUrl: string;
  attribution: string;
};
export type FreeStreamingSource = {
  name: string;
  sourceUrl: string;
  playableUrl?: string;
  licenseUrl: string;
  license: string;
  attribution: string;
  verified: boolean;
  archiveId?: string;
};
export type Movie = {
  playable?: boolean;
  verifiedLegal?: boolean;
  captionTracks?: CaptionTrack[];
  playbackCandidates?: PlaybackCandidate[];
  tmdbId?: number;
  id: string;
  title: string;
  originalTitle?: string;
  releaseDate?: string;
  runtime?: number;
  voteCount?: number;
  year: number;
  genre: string;
  rating: number;
  duration: string;
  certificate: string;
  poster: string;
  backdrop: string;
  overview: string;
  director: string;
  cast: string[];
  free?: boolean;
  provider: string;
  providerUrl: string;
  trailerUrl?: string;
  trailer?: Trailer;
  contentMode: ContentMode;
  source?: FreeStreamingSource;
  freeSource?: FreeSource;
  genreIds?: number[];
  origin: "tmdb" | "curated" | "archive";
};
export type MovieDetails = Movie & {
  genres: Genre[];
  credits: { cast: CastMember[]; crew: CrewMember[] };
  trailers: Trailer[];
  providers: StreamingProvider[];
  providerStatus: "available" | "empty" | "unavailable";
};
export type DataStatus = "live" | "fallback" | "unavailable";
export type SearchResult = {
  movies: Movie[];
  status: DataStatus;
  message?: string;
};
export type Catalog = SearchResult & {
  trending: Movie[];
  popular: Movie[];
  nowPlaying: Movie[];
  upcoming: Movie[];
  free: Movie[];
  genres: Genre[];
};
export type WatchlistEntry = { movie: Movie; addedAt: number };
export type WatchHistory = { movie: Movie; viewedAt: number };
export type PlaybackProgress = {
  movie: Movie;
  currentTime: number;
  duration: number;
  lastWatched: number;
  completed: boolean;
};
export type ContinueWatching = PlaybackProgress[];
export type Entitlement = {
  tier: "free" | "premium";
  removeAds: boolean;
  cloudSync: boolean;
};

export type MovieDetail = MovieDetails;
export type WatchProvider = StreamingProvider;
export type WatchProgress = PlaybackProgress;
export type CountryPreference = { country: Country };

export type CaptionTrack = { src: string; language: string; label: string };
export type PlaybackCandidate = { sourceProvider?: "internet_archive" | "wikimedia" | "blender"; sourceId?: string; fileName?: string; index?: number; verifiedLegal?: boolean; licenseType?: string; licenseUrl?: string; attribution?: string; quality?: string; transportVerified?: boolean; url: string; mimeType: string; height?: number; health: "healthy" | "unknown" | "broken" };
export type FreeLegalMovie = { id: string; title: string; overview: string; posterUrl: string; backdropUrl?: string; year?: number; runtime?: number; genres: string[]; creator?: string; language?: string; sourceProvider: string; sourcePageUrl: string; playbackCandidates: PlaybackCandidate[]; captionTracks: CaptionTrack[]; licenseType: string; licenseUrl?: string; attribution: string; verifiedLegal: boolean; playable: boolean; lastVerifiedAt: string };
