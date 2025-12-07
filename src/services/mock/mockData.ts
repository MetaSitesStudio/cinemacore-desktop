import { Movie } from '@/types';

export const MOCK_MOVIES: Movie[] = [
  {
    id: "1",
    title: "Inception",
    year: 2010,
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920",
    rating: 8.8,
    runtime: 148,
    genres: ["Action", "Sci-Fi", "Thriller"],
    isWatched: true,
    isInContinueWatching: true
  },
  {
    id: "2",
    title: "The Dark Knight",
    year: 2008,
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://images.unsplash.com/photo-1509347528160-9a9e33742cd4?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1509347528160-9a9e33742cd4?auto=format&fit=crop&q=80&w=1920",
    rating: 9.0,
    runtime: 152,
    genres: ["Action", "Crime", "Drama"],
    isRecentlyAdded: true
  },
  {
    id: "3",
    title: "Interstellar",
    year: 2014,
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1920",
    rating: 8.6,
    runtime: 169,
    genres: ["Adventure", "Drama", "Sci-Fi"],
    isRecentlyAdded: true
  },
  {
    id: "4",
    title: "Dune",
    year: 2021,
    description: "A noble family becomes embroiled in a war for control over the galaxy's most valuable asset while its heir becomes troubled by visions of a dark future.",
    posterUrl: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=1920",
    rating: 8.0,
    runtime: 155,
    genres: ["Action", "Adventure", "Drama"]
  },
  {
    id: "5",
    title: "Blade Runner 2049",
    year: 2017,
    description: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who's been missing for thirty years.",
    posterUrl: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&q=80&w=1920",
    rating: 8.0,
    runtime: 164,
    genres: ["Action", "Drama", "Sci-Fi"]
  },
  {
    id: "6",
    title: "The Matrix",
    year: 1999,
    description: "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
    posterUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1920",
    rating: 8.7,
    runtime: 136,
    genres: ["Action", "Sci-Fi"]
  },
  {
    id: "7",
    title: "Parasite",
    year: 2019,
    description: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    posterUrl: "https://images.unsplash.com/photo-1596727147705-54a9d099308d?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1596727147705-54a9d099308d?auto=format&fit=crop&q=80&w=1920",
    rating: 8.5,
    runtime: 132,
    genres: ["Drama", "Thriller"]
  },
  {
    id: "8",
    title: "The Shawshank Redemption",
    year: 1994,
    description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    posterUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600",
    backdropUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1920",
    rating: 9.3,
    runtime: 142,
    genres: ["Drama"]
  }
];
