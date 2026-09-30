import type { Movie } from "../types/movie";

export const movies: Movie[] = [
  {
    id: "1",
    title: "City of Stars",
    year: 2026,
    genre: "Drama",
    rating: 8.4,
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=80",
    backdrop: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=85",
    overview: "A cinematic story about ambition, family and second chances.",
    badge: "TRENDING",
    provider: "Prime Video"
  },
  {
    id: "2",
    title: "Midnight Train",
    year: 2024,
    genre: "Thriller",
    rating: 7.9,
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=80",
    backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=85",
    overview: "A late-night journey changes the lives of five strangers forever.",
    badge: "FREE",
    free: true
  },
  {
    id: "3",
    title: "Monsoon Letters",
    year: 2025,
    genre: "Romance",
    rating: 8.1,
    poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80",
    backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=85",
    overview: "Two old friends reconnect through letters during monsoon season.",
    provider: "Netflix"
  },
  {
    id: "4",
    title: "Island Pulse",
    year: 2026,
    genre: "Adventure",
    rating: 8.7,
    poster: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=700&q=80",
    backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1400&q=85",
    overview: "A group of friends discovers a forgotten island festival.",
    badge: "HOT",
    provider: "Disney+"
  },
  {
    id: "5",
    title: "The Last Projection",
    year: 1968,
    genre: "Classic",
    rating: 7.6,
    poster: "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?auto=format&fit=crop&w=700&q=80",
    backdrop: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?auto=format&fit=crop&w=1400&q=85",
    overview: "A restored public-domain classic presented for free viewing.",
    badge: "WATCH FREE",
    free: true
  },
  {
    id: "6",
    title: "Neon Manila",
    year: 2025,
    genre: "Crime",
    rating: 8.2,
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=80",
    backdrop: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1400&q=85",
    overview: "A night-shift photographer witnesses a story bigger than the city.",
    provider: "Apple TV"
  }
];

export const heroMovie = movies[0];
