import { useMemo, useState } from "react";
import {
  Bell,
  Compass,
  Crown,
  Home,
  Play,
  Search,
  Sparkles,
  Star,
  User,
  Video,
} from "lucide-react";
import { heroMovie, movies } from "./data/movies";
import type { Movie } from "./types/movie";

type Tab = "home" | "free" | "discover" | "search" | "profile";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [selected, setSelected] = useState<Movie | null>(null);

  const freeMovies = useMemo(() => movies.filter((movie) => movie.free), []);

  if (selected) {
    return <MovieDetail movie={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="app-shell">
      <main className="app-content">
        {tab === "home" && (
          <>
            <header className="topbar">
              <div>
                <span className="brand-kicker">WATCH • DISCOVER • ENJOY</span>
                <h1>Reel<span>Tara</span></h1>
              </div>
              <div className="top-actions">
                <button aria-label="Notifications"><Bell size={19} /></button>
                <div className="avatar"><User size={17} /></div>
              </div>
            </header>

            <section className="hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(5,8,13,.08), #070a0f 94%), linear-gradient(90deg, rgba(5,8,13,.92), rgba(5,8,13,.15)), url("${heroMovie.backdrop}")` }}>
              <div className="hero-content">
                <span className="hero-label"><Sparkles size={13} /> #1 TRENDING TODAY</span>
                <h2>{heroMovie.title}</h2>
                <div className="meta"><Star size={14} fill="currentColor" /> {heroMovie.rating} <i /> {heroMovie.year} <i /> {heroMovie.genre}</div>
                <p>{heroMovie.overview}</p>
                <div className="hero-buttons">
                  <button className="primary" onClick={() => setSelected(heroMovie)}><Play size={17} fill="currentColor" /> Trailer</button>
                  <button className="secondary" onClick={() => setSelected(heroMovie)}>Where to Watch</button>
                </div>
              </div>
            </section>

            <MovieRow title="Watch Free" subtitle="Legal movies you can watch now" movies={freeMovies} onSelect={setSelected} />
            <MovieRow title="Trending Now" movies={movies.slice(0, 5)} onSelect={setSelected} />
            <PromoCard />
            <MovieRow title="Popular in India & Philippines" movies={[...movies].reverse()} onSelect={setSelected} />
          </>
        )}

        {tab === "free" && <SimplePage title="Watch Free" eyebrow="LEGAL & FREE" movies={freeMovies} onSelect={setSelected} />}
        {tab === "discover" && <SimplePage title="Discover" eyebrow="WHAT'S HOT" movies={movies} onSelect={setSelected} />}
        {tab === "search" && <SearchPage movies={movies} onSelect={setSelected} />}
        {tab === "profile" && <ProfilePage />}
      </main>

      <nav className="bottom-nav">
        <NavItem active={tab === "home"} icon={<Home size={20} />} label="Home" onClick={() => setTab("home")} />
        <NavItem active={tab === "free"} icon={<Video size={20} />} label="Free" onClick={() => setTab("free")} />
        <NavItem active={tab === "discover"} icon={<Compass size={20} />} label="Discover" onClick={() => setTab("discover")} />
        <NavItem active={tab === "search"} icon={<Search size={20} />} label="Search" onClick={() => setTab("search")} />
        <NavItem active={tab === "profile"} icon={<User size={20} />} label="Profile" onClick={() => setTab("profile")} />
      </nav>
    </div>
  );
}

function MovieRow({ title, subtitle, movies, onSelect }: { title: string; subtitle?: string; movies: Movie[]; onSelect: (movie: Movie) => void }) {
  return (
    <section className="section">
      <div className="section-head">
        <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        <button>See all</button>
      </div>
      <div className="movie-row">
        {movies.map((movie) => <MovieCard key={movie.id} movie={movie} onClick={() => onSelect(movie)} />)}
      </div>
    </section>
  );
}

function MovieCard({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  return (
    <button className="movie-card" onClick={onClick}>
      <div className="poster" style={{ backgroundImage: `url("${movie.poster}")` }}>
        {movie.badge && <span className={movie.free ? "badge free" : "badge"}>{movie.badge}</span>}
        <div className="poster-rating"><Star size={11} fill="currentColor" /> {movie.rating}</div>
      </div>
      <strong>{movie.title}</strong>
      <span>{movie.year} • {movie.genre}</span>
    </button>
  );
}

function MovieDetail({ movie, onBack }: { movie: Movie; onBack: () => void }) {
  return (
    <div className="detail-page">
      <div className="detail-backdrop" style={{ backgroundImage: `linear-gradient(180deg, rgba(7,10,15,.05), #070a0f), url("${movie.backdrop}")` }}>
        <button className="back-btn" onClick={onBack}>←</button>
      </div>
      <div className="detail-body">
        <span className="brand-kicker">{movie.free ? "FREE TO WATCH" : "MOVIE DISCOVERY"}</span>
        <h2>{movie.title}</h2>
        <div className="meta"><Star size={14} fill="currentColor" /> {movie.rating} <i /> {movie.year} <i /> {movie.genre}</div>
        <p>{movie.overview}</p>
        <button className="primary full"><Play size={18} fill="currentColor" /> {movie.free ? "Watch Free" : "Watch Trailer"}</button>
        {!movie.free && <button className="provider-btn">Watch on {movie.provider || "Legal Provider"} ↗</button>}
        <div className="disclaimer">Streaming availability and access terms are provided by the external legal provider.</div>
      </div>
    </div>
  );
}

function SimplePage({ title, eyebrow, movies, onSelect }: { title: string; eyebrow: string; movies: Movie[]; onSelect: (movie: Movie) => void }) {
  return (
    <div className="page-pad">
      <span className="brand-kicker">{eyebrow}</span>
      <h2 className="page-title">{title}</h2>
      <div className="movie-grid">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} onClick={() => onSelect(movie)} />)}</div>
    </div>
  );
}

function SearchPage({ movies, onSelect }: { movies: Movie[]; onSelect: (movie: Movie) => void }) {
  const [query, setQuery] = useState("");
  const result = movies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="page-pad">
      <span className="brand-kicker">FIND YOUR NEXT MOVIE</span>
      <h2 className="page-title">Search</h2>
      <div className="search-box"><Search size={18} /><input autoFocus placeholder="Search movies, genres…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="movie-grid">{result.map((movie) => <MovieCard key={movie.id} movie={movie} onClick={() => onSelect(movie)} />)}</div>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="page-pad">
      <span className="brand-kicker">YOUR REELTARA</span>
      <h2 className="page-title">Profile</h2>
      <div className="premium-card">
        <Crown size={26} />
        <div><strong>ReelTara Premium</strong><p>Remove ads, sync your watchlist and unlock advanced discovery.</p></div>
        <button>Explore</button>
      </div>
      <div className="profile-list">
        <button>My List <span>›</span></button>
        <button>Continue Watching <span>›</span></button>
        <button>Country & Language <span>India / Philippines ›</span></button>
        <button>Settings <span>›</span></button>
      </div>
    </div>
  );
}

function PromoCard() {
  return (
    <section className="promo">
      <div><span>REELTARA PREMIUM</span><h3>Movies without the clutter.</h3><p>Ad-free browsing, smart alerts and a synced watchlist.</p></div>
      <Crown size={34} />
    </section>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>{icon}<span>{label}</span></button>;
}
