import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Flame,
  Home,
  LayoutGrid,
  Play,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  WifiOff,
  X,
} from "lucide-react";
import { genres as homeGenres, movies as seedMovies } from "./data/movies";
import { useCatalog, useMovieSearch } from "./hooks/useCatalog";
import { MovieService } from "./services/catalog";
import {
  PlaybackService,
  UserStateService,
  WatchlistService,
} from "./services/userState";
import { canPlay, legalUrl } from "./services/legal";
import { AppError } from "./services/http";
import { ProviderPicker } from "./components/ProviderPicker";
import { Player } from "./components/Player";
import type {
  Movie,
  MovieDetails,
  Country,
  StreamingProvider,
} from "./types/movie";
import {
  BrandLogo,
  EmptyState,
  MovieCard,
  MovieImage,
  PrimaryButton,
  ProviderButton,
  RatingBadge,
  SecondaryButton,
  SectionHeader,
} from "./components/ui";

type Tab =
  "home" | "discover" | "free" | "trailers" | "list" | "profile" | "search";
const navigation = [
  { id: "home", label: "Home", icon: Home },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "free", label: "Free to Watch", icon: Film },
  { id: "trailers", label: "Hot Trailers", icon: Play },
  { id: "list", label: "My Watchlist", icon: Bookmark },
] as const;
export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [selected, setSelected] = useState<Movie | null>(null);
  const user = useSyncExternalStore(
    UserStateService.subscribe,
    UserStateService.snapshot,
  );
  const saved = user.watchlist.map((entry) => entry.movie.id);
  const { catalog, loading: catalogLoading, retry } = useCatalog(user.country);
  const movies = catalog.movies;
  const genres = [
    "All",
    ...new Set(
      movies
        .flatMap((m) => m.genre.split(" · "))
        .filter((g) => g && g !== "Unknown"),
    ),
  ];
  const [detail, setDetail] = useState<MovieDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRevision, setDetailRevision] = useState(0);
  const [providerPicker, setProviderPicker] = useState<{
    initial?: StreamingProvider;
  } | null>(null);
  const [player, setPlayer] = useState<{
    movie: Movie;
    mode: "free" | "trailer";
  } | null>(null);
  const positions = useRef<Partial<Record<Tab, number>>>({});
  const tabFilters = useRef<
    Partial<Record<Tab, { query: string; genre: string; sort: string }>>
  >({});
  const trailerIntent = useRef<string | null>(null);
  const [searchRevision, setSearchRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("featured");
  const [heroIndex, setHeroIndex] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const storageError = UserStateService.storageFailed();
  const [notice, setNotice] = useState("");
  const search = useMovieSearch(
    query,
    user.country,
    tab === "search" || tab === "discover",
    searchRevision,
  );
  useEffect(() => {
    WatchlistService.migrate(seedMovies);
    const sync = () => UserStateService.refresh();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    MovieService.details(selected, user.country)
      .then((movie) => {
        if (active) setDetail(movie);
      })
      .catch((error) => {
        if (active)
          setDetailError(
            error instanceof AppError && error.code === "movie_not_found"
              ? "Movie not found."
              : "Full details unavailable. Showing loaded metadata.",
          );
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, user.country, detailRevision]);
  const restorePosition = (next: Tab) =>
    requestAnimationFrame(() =>
      window.scrollTo({
        top: positions.current[next] || 0,
        behavior: "instant",
      }),
    );
  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      setProviderPicker(null);
      const nextMovie: Movie | null = event.state?.movie || null;
      setPlayer(
        event.state?.player && nextMovie
          ? {
              movie: nextMovie,
              mode: event.state.playerMode === "free" ? "free" : "trailer",
            }
          : null,
      );
      setSelected((previous) =>
        previous?.id === nextMovie?.id ? previous : nextMovie,
      );
      if (event.state?.tab) setTab(event.state.tab);
      if (event.state?.filters) {
        setQuery(event.state.filters.query);
        setGenre(event.state.filters.genre);
        setSort(event.state.filters.sort);
      }
      if (!event.state?.movie) restorePosition(event.state?.tab || tab);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [tab]);
  const current = detail?.id === selected?.id ? detail : selected;
  const closeDetail = () => {
    if (history.state?.movie) history.back();
    else {
      setSelected(null);
      restorePosition(tab);
    }
  };
  const openPlayer = (movie: Movie, mode: "free" | "trailer") => {
    history.pushState(
      { ...history.state, movie, tab, player: true, playerMode: mode },
      "",
    );
    setPlayer({ movie, mode });
  };
  const closePlayer = () => {
    if (history.state?.player) history.back();
    else setPlayer(null);
  };
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    document.title = selected
      ? `${selected.title} · ReelTara`
      : "ReelTara — Find your next great story";
  }, [selected]);
  const navigate = (next: Tab, nextGenre?: string) => {
    if (!selected) positions.current[tab] = window.scrollY;
    setProviderPicker(null);
    trailerIntent.current = null;
    tabFilters.current[tab] = { query, genre, sort };
    const remembered = tabFilters.current[next];
    setQuery(remembered?.query || "");
    setGenre(remembered?.genre || "All");
    setSort(remembered?.sort || "featured");
    history.replaceState({ tab: next }, "");
    setTab(next);
    setSelected(null);
    setPlayer(null);
    if (nextGenre) {
      setGenre(nextGenre);
      setQuery("");
    }
    restorePosition(next);
  };
  const beginSearch = (value: string) => {
    if (tab !== "search") {
      if (!selected) positions.current[tab] = window.scrollY;
      tabFilters.current[tab] = { query, genre, sort };
      setGenre("All");
      setSort("featured");
    }
    trailerIntent.current = null;
    history.replaceState({ tab: "search" }, "");
    setTab("search");
    setSelected(null);
    setQuery(value);
  };
  const select = (movie: Movie) => {
    if (!selected) positions.current[tab] = window.scrollY;
    const filters = { query, genre, sort };
    if (!selected) history.replaceState({ tab, filters }, "");
    history.pushState({ movie, tab, filters }, "");
    trailerIntent.current = null;
    setSelected(movie);
    UserStateService.viewed(movie);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const toggleSave = (movie: Movie) => {
    WatchlistService.toggle(movie);
    setNotice(
      `${movie.title} ${WatchlistService.has(movie.id) ? "added to" : "removed from"} your watchlist`,
    );
  };
  const heroMovies = catalog.trending.slice(0, 3);
  const hero = heroMovies[heroIndex % heroMovies.length] || seedMovies[0];
  const watchTrailer = (movie: Movie) => {
    select(movie);
    trailerIntent.current = movie.id;
  };
  useEffect(() => {
    if (!detail || trailerIntent.current !== detail.id) return;
    trailerIntent.current = null;
    if (detail.trailerUrl) openPlayer(detail, "trailer");
    else setNotice("Trailer unavailable for this movie.");
  }, [detail]);
  const cards = (items: Movie[], wide = false, trailer = false) =>
    items.map((movie) => (
      <MovieCard
        key={movie.id}
        movie={movie}
        onSelect={trailer ? watchTrailer : select}
        saved={saved.includes(movie.id)}
        onSave={toggleSave}
        wide={wide}
        trailer={trailer}
      />
    ));
  const browse =
    tab === "list"
      ? user.watchlist.map((entry) => entry.movie)
      : query.trim() && (tab === "search" || tab === "discover")
        ? search.movies
        : tab === "discover" && sort === "popular"
          ? catalog.popular
          : tab === "discover" && sort === "trending"
            ? catalog.trending
            : movies;
  const filtered = browse
    .filter(
      (movie) =>
        (tab !== "free" || movie.free) &&
        (tab !== "trailers" || movie.contentMode === "discovery") &&
        (tab !== "list" || saved.includes(movie.id)) &&
        (genre === "All" || movie.genre.split(" · ").includes(genre)) &&
        (tab === "search" ||
          tab === "discover" ||
          movie.title.toLowerCase().includes(query.toLowerCase().trim())),
    )
    .sort((a, b) =>
      sort === "rating"
        ? b.rating - a.rating
        : sort === "year"
          ? b.year - a.year
          : 0,
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand-home"
          aria-label="ReelTara home"
          onClick={() => navigate("home")}
        >
          <BrandLogo />
        </button>
        <span className="brand-tagline">A WORLD OF STORIES.</span>
        <div className="nav-caption">MENU</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id && !selected ? "active" : ""}`}
              aria-current={tab === id && !selected ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "free" && <span className="nav-dot" />}
              {id === "list" && saved.length > 0 && (
                <small>{saved.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note">
            <ShieldCheck size={23} />
            <strong>Great stories. Real sources.</strong>
            <p>
              Discover freely.
              <br />
              Watch legally.
            </p>
            <button onClick={() => navigate("free")}>
              Explore free movies <ArrowUpRightIcon />
            </button>
          </div>
          <button
            className={`nav-item ${tab === "profile" ? "active" : ""}`}
            onClick={() => navigate("profile")}
          >
            <User size={19} />
            Your profile
          </button>
          <div className="sidebar-copyright">
            © {new Date().getFullYear()} ReelTara
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="desktop-greeting">
            <span>Your next great story starts here.</span>
            <span className="header-dot" />
            Let's find it.
          </div>
          <button
            className="mobile-brand brand-home"
            aria-label="ReelTara home"
            onClick={() => navigate("home")}
          >
            <BrandLogo />
          </button>
          <div className="top-actions">
            <form
              className="header-search"
              onSubmit={(event) => {
                event.preventDefault();
                beginSearch(query);
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search movies"
                placeholder="Search movie titles..."
                value={query}
                onChange={(event) => {
                  beginSearch(event.target.value);
                }}
              />
              <kbd>↵</kbd>
            </form>
            <button
              className="mobile-search icon-button"
              aria-label="Open search"
              onClick={() => navigate("search")}
            >
              <Search size={20} />
            </button>
            <button
              className="avatar"
              aria-label="Open profile"
              onClick={() => navigate("profile")}
            >
              J<span />
            </button>
          </div>
        </header>
        {!online && (
          <div className="status-banner" role="status">
            <WifiOff size={17} />
            You're offline. You can browse loaded movies; reconnect to open
            trailers and providers.
          </div>
        )}
        {storageError && (
          <div className="status-banner" role="status">
            Your browser cannot save this watchlist. Changes are kept for this
            session.
          </div>
        )}
        <main id="main">
          {(catalogLoading || catalog.message) && !selected && (
            <div className="status-banner" role="status">
              {catalogLoading ? "Loading live catalog…" : catalog.message}
              {!catalogLoading && <button onClick={retry}>Retry</button>}
            </div>
          )}

          {current ? (
            <div className="detail-page">
              <button className="back-link" onClick={closeDetail}>
                <ArrowLeft size={18} /> Back to exploring
              </button>
              {detailLoading && (
                <div className="status-banner skeleton" role="status">
                  Loading movie details…
                </div>
              )}
              {detailError && (
                <div className="status-banner" role="status">
                  {detailError}{" "}
                  <button onClick={() => setDetailRevision((v) => v + 1)}>
                    Retry
                  </button>
                </div>
              )}
              <div
                className="detail-visual"
                style={{
                  backgroundImage: `linear-gradient(90deg, #0b1020 3%, #0b102040 100%), url(${current.backdrop})`,
                }}
              >
                <div>
                  <span className="eyebrow">
                    {current.free
                      ? `FREE TO WATCH · ${current.source?.name || "OPEN MOVIE"}`
                      : "THE REELTARA COLLECTION"}
                  </span>
                  <h1>{current.title}</h1>
                  {current.originalTitle &&
                    current.originalTitle !== current.title && (
                      <p>{current.originalTitle}</p>
                    )}
                  <Metadata movie={current} />
                  <div className="hero-buttons">
                    {current.contentMode === "free_legal" ? (
                      canPlay(current) ? (
                        <PrimaryButton
                          onClick={() => openPlayer(current, "free")}
                        >
                          <Play size={17} />
                          {PlaybackService.resume(current.id) > 0
                            ? "Resume"
                            : user.progress[current.id]?.completed
                              ? "Watch Again"
                              : "Watch Free"}
                        </PrimaryButton>
                      ) : (
                        <ProviderButton movie={current} />
                      )
                    ) : null}
                    {current.trailerUrl && (
                      <button
                        disabled={detailLoading}
                        className={`button ${current.contentMode === "free_legal" ? "secondary" : "primary"}`}
                        onClick={() => openPlayer(current, "trailer")}
                      >
                        <Play size={17} fill="currentColor" /> Watch Trailer
                      </button>
                    )}
                    {current.contentMode === "discovery" && (
                      <ProviderButton
                        movie={current}
                        onClick={() => setProviderPicker({})}
                      />
                    )}
                    {!detailLoading && !current.trailerUrl && !current.free && (
                      <span role="status">Trailer unavailable</span>
                    )}
                    <SecondaryButton
                      onClick={() => toggleSave(current)}
                      pressed={saved.includes(current.id)}
                    >
                      {saved.includes(current.id) ? (
                        <Check size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                      {saved.includes(current.id) ? "Saved" : "My Watchlist"}
                    </SecondaryButton>
                  </div>
                </div>
              </div>
              <div className="detail-info">
                <div className="detail-poster">
                  <MovieImage
                    src={current.poster}
                    title={current.title}
                    eager
                  />
                </div>
                <div>
                  <span className="eyebrow">THE STORY</span>
                  <h2>Every story takes you somewhere.</h2>
                  <p className="overview">{current.overview}</p>
                  <div className="credits">
                    <div>
                      <span>Director</span>
                      <strong>{current.director}</strong>
                    </div>
                    <div>
                      <span>Genre</span>
                      <strong>{current.genre}</strong>
                    </div>
                    <div>
                      <span>Starring</span>
                      <strong>{current.cast.join(" · ")}</strong>
                    </div>
                  </div>
                  {current.free && (
                    <div className="hero-buttons">
                      <ProviderButton movie={current} />
                      {legalUrl(current.source?.licenseUrl) && (
                        <a
                          href={legalUrl(current.source?.licenseUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {current.source?.license}
                        </a>
                      )}
                    </div>
                  )}
                  {!current.free && (
                    <div className="provider-availability">
                      <h3>Where to Watch · {user.country}</h3>
                      {detailLoading ? (
                        <p role="status">Checking availability…</p>
                      ) : detail?.providers.length ? (
                        <div className="hero-buttons">
                          {detail.providers.map((p) => (
                            <a
                              className="button secondary"
                              key={`${p.id}-${p.kind}`}
                              href={legalUrl(p.url)}
                              onClick={(event) => {
                                event.preventDefault();
                                setProviderPicker({ initial: p });
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {p.logoUrl && (
                                <img
                                  className="provider-logo"
                                  src={p.logoUrl}
                                  alt=""
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.hidden = true;
                                  }}
                                />
                              )}
                              {p.name} · {p.kind}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p role="status">
                          {detail?.providerStatus === "empty"
                            ? "No providers listed for this country."
                            : "Provider availability unavailable."}
                        </p>
                      )}
                      {!detailLoading &&
                        detail?.providerStatus === "unavailable" && (
                          <button
                            className="back-link"
                            onClick={() => setDetailRevision((v) => v + 1)}
                          >
                            Retry availability
                          </button>
                        )}
                      {current.origin === "curated" && (
                        <ProviderButton movie={current} />
                      )}
                      <p>
                        Availability: JustWatch. Provider links open the
                        official TMDB watch page.
                      </p>
                    </div>
                  )}
                  <div className="legal-note">
                    <ShieldCheck size={22} />
                    <div>
                      <strong>
                        {current.free
                          ? "Free, from the original creator."
                          : "Find it on a licensed platform."}
                      </strong>
                      <p>
                        {current.free
                          ? `${current.source?.attribution || ""} · ${current.source?.license || "License not listed"}. ${canPlay(current) ? "Watch here or visit the official source." : "Legal stream unavailable in this player. Visit the source."}`
                          : `Discovery only. Full movies play on licensed platforms. Availability for ${user.country === "IN" ? "India" : "Philippines"} is supplied by JustWatch via TMDB.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <section className="section">
                <SectionHeader
                  title="Keep the story going"
                  subtitle="More picks for your next movie night"
                />
                <div className="movie-row">
                  {cards(
                    movies
                      .filter((movie) => movie.id !== current.id)
                      .slice(0, 6),
                  )}
                </div>
              </section>
            </div>
          ) : tab === "home" ? (
            <>
              <section className={`hero hero-${hero.id}`}>
                <div
                  className="hero-art"
                  style={{ backgroundImage: `url(${hero.backdrop})` }}
                />
                <div className="hero-overlay" />
                <div className="hero-content">
                  <span className="hero-label">
                    <span /> THE SPOTLIGHT{" "}
                    <span className="label-divider">/</span> HANDPICKED FOR YOU
                  </span>
                  {hero.id === "dune" ? (
                    <h1 className="dune-title">
                      DUNE<span>PART TWO</span>
                    </h1>
                  ) : (
                    <h1>{hero.title}</h1>
                  )}
                  <div className="hero-genre">
                    {hero.genre.toUpperCase()} <span>•</span>{" "}
                    {hero.id === "dune"
                      ? "ADVENTURE"
                      : "A STORY WORTH DISCOVERING"}
                  </div>
                  <Metadata movie={hero} />
                  <p>{hero.overview}</p>
                  <div className="hero-buttons">
                    <PrimaryButton onClick={() => watchTrailer(hero)}>
                      <Play size={16} fill="currentColor" />
                      Watch Trailer
                    </PrimaryButton>
                    <ProviderButton movie={hero} onClick={() => select(hero)} />
                    <SecondaryButton
                      onClick={() => toggleSave(hero)}
                      pressed={saved.includes(hero.id)}
                      label={
                        saved.includes(hero.id)
                          ? `Remove ${hero.title}`
                          : `Save ${hero.title}`
                      }
                    >
                      {saved.includes(hero.id) ? (
                        <Check size={19} />
                      ) : (
                        <Plus size={19} />
                      )}
                    </SecondaryButton>
                  </div>
                  <button className="hero-details" onClick={() => select(hero)}>
                    Explore the story <ArrowRight size={14} />
                  </button>
                </div>
                <div className="hero-bottom">
                  <span>
                    <ShieldCheck size={13} /> Discover here. Watch on official
                    platforms.
                  </span>
                  <div className="hero-pagination">
                    {heroMovies.map((movie, index) => (
                      <button
                        aria-label={`Feature ${movie.title}`}
                        aria-pressed={index === heroIndex}
                        className={index === heroIndex ? "current" : ""}
                        key={movie.id}
                        onClick={() => setHeroIndex(index)}
                      />
                    ))}
                    <span>
                      0{(heroIndex % heroMovies.length) + 1}{" "}
                      <em>/ 0{heroMovies.length}</em>
                    </span>
                    <button
                      className="hero-arrow"
                      aria-label="Previous featured movie"
                      onClick={() =>
                        setHeroIndex(
                          (heroIndex + heroMovies.length - 1) %
                            heroMovies.length,
                        )
                      }
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="hero-arrow"
                      aria-label="Next featured movie"
                      onClick={() =>
                        setHeroIndex((heroIndex + 1) % heroMovies.length)
                      }
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </section>
              <div className="home-content">
                {PlaybackService.continuing().length > 0 && (
                  <section className="section">
                    <SectionHeader
                      title="Continue Watching"
                      subtitle="Pick up where you left off"
                    />
                    <div className="movie-row">
                      {cards(PlaybackService.continuing().map((p) => p.movie))}
                    </div>
                  </section>
                )}
                <div className="discovery-strip">
                  <span>
                    <Sparkles size={16} /> Find your kind of story
                  </span>
                  <div>
                    {homeGenres.map((item) => (
                      <button
                        key={item}
                        className={item === "All" ? "selected" : ""}
                        onClick={() => navigate("discover", item)}
                      >
                        {item === "All" ? "For you" : item}
                      </button>
                    ))}
                  </div>
                  <button
                    className="browse-button"
                    onClick={() => navigate("discover")}
                  >
                    <LayoutGrid size={15} /> Browse all
                  </button>
                </div>
                <section className="section">
                  <SectionHeader
                    title="Trending Now"
                    subtitle="The stories everyone is talking about"
                    icon={<Flame size={21} />}
                    onMore={() => navigate("discover")}
                  />
                  <div className="movie-row">
                    {cards(catalog.trending.slice(0, 6))}
                  </div>
                </section>
                <section className="free-section section">
                  <SectionHeader
                    title="Free to Watch"
                    subtitle="Little screen. Big stories. Zero subscription."
                    icon={<Film size={21} />}
                    onMore={() => navigate("free")}
                  />
                  <div className="free-grid">
                    {cards(
                      movies.filter((movie) => movie.free),
                      true,
                    )}
                  </div>
                  <div className="free-footnote">
                    <ShieldCheck size={13} /> Official open movies. Always free.
                    Always from the source.
                  </div>
                </section>
                <section className="section">
                  <SectionHeader
                    title="Hot Trailers"
                    subtitle="A little preview of your next obsession"
                    icon={<Play size={19} />}
                    onMore={() => navigate("trailers")}
                  />
                  <div className="trailer-row">
                    {cards(catalog.trending.slice(0, 3), true, true)}
                  </div>
                </section>
                <section className="genre-section section">
                  <SectionHeader
                    title="What's your mood?"
                    subtitle="There's a whole world to get lost in"
                  />
                  <div className="genre-grid">
                    {homeGenres.slice(1).map((item, index) => (
                      <button
                        key={item}
                        className={`genre-tile genre-${index}`}
                        onClick={() => navigate("discover", item)}
                      >
                        <span>0{index + 1}</span>
                        <strong>{item}</strong>
                        <ArrowUpRightIcon />
                      </button>
                    ))}
                  </div>
                </section>
                <div className="watchlist-banner">
                  <div className="banner-mark">
                    <BrandLogo icon />
                  </div>
                  <div>
                    <span className="eyebrow">
                      GOOD STORIES ARE WORTH KEEPING
                    </span>
                    <h2>Your next movie night, sorted.</h2>
                    <p>
                      Save the films that catch your eye. Come back when the
                      mood is right.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => navigate("list")}
                  >
                    <Bookmark size={16} />
                    My Watchlist <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : tab === "profile" ? (
            <div className="page-pad">
              <span className="eyebrow">YOUR REELTARA</span>
              <h1>A space for your stories.</h1>
              <div className="profile-card">
                <div className="profile-avatar">J</div>
                <div>
                  <h2>Hey, movie lover.</h2>
                  <p>Your personal corner of the cinema.</p>
                </div>
              </div>
              <div className="profile-grid">
                <div className="profile-panel">
                  <h2>Country</h2>
                  <p>Show legal viewing options for your country.</p>
                  <label className="sort-label">
                    <select
                      aria-label="Country"
                      value={user.country}
                      onChange={(event) =>
                        UserStateService.setCountry(
                          event.target.value as Country,
                        )
                      }
                    >
                      <option value="IN">India</option>
                      <option value="PH">Philippines</option>
                    </select>
                  </label>
                </div>
                <button
                  className="profile-panel"
                  onClick={() => navigate("list")}
                >
                  <Bookmark size={25} />
                  <h2>{saved.length} saved stories</h2>
                  <p>Your watchlist stays in this browser.</p>
                  <span>
                    Open your watchlist <ArrowRight size={16} />
                  </span>
                </button>
                <div className="profile-panel">
                  <ShieldCheck size={25} />
                  <h2>A better way to discover.</h2>
                  <p>
                    ReelTara brings you trailers, film information and official
                    viewing links. Free films come directly from their creators.
                  </p>
                  <BrandLogo />
                </div>
              </div>
            </div>
          ) : (
            <div className="page-pad">
              <span className="eyebrow">
                {tab === "free"
                  ? "FROM THE CREATORS, FOR EVERYONE"
                  : tab === "list"
                    ? "YOUR PERSONAL COLLECTION"
                    : "FIND YOUR NEXT GREAT STORY"}
              </span>
              <h1>
                {
                  (
                    {
                      discover: "Discover something extraordinary.",
                      free: "Great cinema. Free to watch.",
                      trailers: "A first look. A lasting impression.",
                      list: "My Watchlist",
                      search: "What are you in the mood for?",
                    } as Record<string, string>
                  )[tab]
                }
              </h1>
              <p className="page-intro">
                {tab === "free"
                  ? "Independent open movies, shared by their creators. Watch here when a compatible legal stream is available."
                  : tab === "trailers"
                    ? "Official trailers and film information. Full movies are available through licensed providers."
                    : tab === "list"
                      ? "All the stories you want to get back to, in one place."
                      : "From faraway worlds to stories that feel like home. Find a film that stays with you."}
              </p>
              <div className="browse-search">
                <Search size={21} />
                <input
                  aria-label="Search catalog"
                  placeholder="Search movie titles..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="filter-bar">
                <div className="genre-chips">
                  {genres.map((item) => (
                    <button
                      className={genre === item ? "selected" : ""}
                      key={item}
                      onClick={() => setGenre(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <label className="sort-label">
                  <SlidersHorizontal size={15} />
                  <select
                    aria-label="Sort movies"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="featured">Featured</option>
                    {tab === "discover" && (
                      <>
                        <option value="trending">Trending</option>
                        <option value="popular">Popular</option>
                      </>
                    )}
                    <option value="rating">Highest rated</option>
                    <option value="year">Newest first</option>
                  </select>
                </label>
              </div>
              {query.trim() &&
                (tab === "search" || tab === "discover") &&
                (search.loading || search.message) && (
                  <div className="status-banner" role="status">
                    {search.loading ? "Searching…" : search.message}
                    {!search.loading && (
                      <button onClick={() => setSearchRevision((v) => v + 1)}>
                        Retry search
                      </button>
                    )}
                  </div>
                )}
              <p className="result-count" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "story" : "stories"}{" "}
                to discover
              </p>
              {search.loading &&
              query.trim() &&
              (tab === "search" || tab === "discover") ? (
                <p className="result-count" role="status">
                  Loading results…
                </p>
              ) : filtered.length ? (
                <div
                  className={`movie-grid ${tab === "free" || tab === "trailers" ? "wide-grid" : ""}`}
                >
                  {cards(
                    filtered,
                    tab === "free" || tab === "trailers",
                    tab === "trailers",
                  )}
                </div>
              ) : (
                <EmptyState
                  title={
                    tab === "list" && saved.length === 0
                      ? "Your next favorite belongs here."
                      : "No stories found. Yet."
                  }
                  text={
                    tab === "list" && saved.length === 0
                      ? "Tap + on a movie to start your collection."
                      : "Try a different title or reset your filters to explore more."
                  }
                  action={
                    tab === "list" && saved.length === 0
                      ? "Discover movies"
                      : "Reset filters"
                  }
                  onAction={() => {
                    if (tab === "list" && saved.length === 0)
                      navigate("discover");
                    else {
                      setQuery("");
                      setGenre("All");
                      setSort("featured");
                    }
                  }}
                />
              )}
            </div>
          )}
        </main>
        <footer>
          <div>
            <BrandLogo icon />
            <span>Watch freely. Discover endlessly.</span>
          </div>
          <p>
            {catalog.status === "live"
              ? "Movie data: TMDB · Availability: JustWatch"
              : "Curated fallback · Sample ratings"}{" "}
            · Availability varies by region. This product uses the TMDB API but
            is not endorsed or certified by TMDB.
          </p>
          <span>Made for the love of cinema.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          { id: "home", label: "Home", icon: Home },
          { id: "discover", label: "Discover", icon: Compass },
          { id: "free", label: "Free", icon: Film },
          { id: "list", label: "Watchlist", icon: Bookmark },
          { id: "profile", label: "Profile", icon: User },
        ].map(({ id, label, icon: Icon }) => (
          <button
            className={tab === id ? "active" : ""}
            aria-current={tab === id ? "page" : undefined}
            key={id}
            onClick={() => navigate(id as Tab)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {providerPicker && current && (
        <ProviderPicker
          providers={detail?.providers || []}
          initial={providerPicker.initial}
          country={user.country}
          onClose={() => setProviderPicker(null)}
        />
      )}
      {player && (
        <Player movie={player.movie} mode={player.mode} onClose={closePlayer} />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
function Metadata({ movie }: { movie: Movie }) {
  return (
    <div className="meta">
      <RatingBadge rating={movie.rating} />
      <span>{movie.year}</span>
      <span>{movie.duration}</span>
      <span className="certificate">{movie.certificate}</span>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} className="diagonal-arrow" />;
}
