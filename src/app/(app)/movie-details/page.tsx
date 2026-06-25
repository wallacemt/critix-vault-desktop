import { MovieDetails } from "@/components/features/media/MovieDetails";

interface MovieDetailsProps {
  searchParams: Promise<{
    demo?: string;
    mode?: string;
  }>;
}
export default async function MovieDetailsPage({ searchParams }: MovieDetailsProps) {
  const params = await searchParams;
  const demo = params?.demo === "true";
  const torrentMode = params?.mode === "torrent";

  return <MovieDetails demoMode={demo} torrentMode={torrentMode} />;
}
