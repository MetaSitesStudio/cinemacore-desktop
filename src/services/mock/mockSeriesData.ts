import { Series } from '@/types';

export const MOCK_SERIES: Series[] = [
  {
    id: "101",
    title: "Breaking Bad",
    year: 2008,
    description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
    posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600", // Placeholder
    backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920",
    rating: 9.5,
    seasons: 5,
    genres: ["Crime", "Drama", "Thriller"],
    isWatched: true
  },
  {
    id: "102",
    title: "Stranger Things",
    year: 2016,
    description: "When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces in order to get him back.",
    posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920",
    rating: 8.7,
    seasons: 4,
    genres: ["Drama", "Fantasy", "Horror"]
  },
  {
    id: "103",
    title: "The Crown",
    year: 2016,
    description: "Follows the political rivalries and romance of Queen Elizabeth II's reign and the events that shaped the second half of the twentieth century.",
    posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920",
    rating: 8.6,
    seasons: 6,
    genres: ["Biography", "Drama", "History"]
  },
  {
    id: "104",
    title: "The Mandalorian",
    year: 2019,
    description: "The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.",
    posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920",
    rating: 8.7,
    seasons: 3,
    genres: ["Action", "Adventure", "Sci-Fi"]
  },
  {
    id: "105",
    title: "Black Mirror",
    year: 2011,
    description: "An anthology series exploring a twisted, high-tech multiverse where humanity's greatest innovations and darkest instincts collide.",
    posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920",
    rating: 8.8,
    seasons: 6,
    genres: ["Drama", "Sci-Fi", "Thriller"]
  }
];
