import { MovieDetails } from "@/components/features/media/MovieDetails";

interface MovieDetailsProps {
  searchParams: Promise<{
    demo?: string;
  }>;
}
export default async function MovieDetailsPage({ searchParams }: MovieDetailsProps) {
  const params = await searchParams;
  const demo = params?.demo === "true";

  return <MovieDetails demoMode={demo} />;
}
