import { SeriesDetails } from "@/components/features/media/SeriesDetails";

interface SerieDetailsProps {
  searchParams: Promise<{
    demo?: string;
  }>;
}
export default async function SeriesDetailsPage({ searchParams }: SerieDetailsProps) {
  const params = await searchParams;
  const demo = params?.demo === "true";

  return <SeriesDetails demoMode={demo} />;
}
