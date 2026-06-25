import { SeriesDetails } from "@/components/features/media/SeriesDetails";

interface SerieDetailsProps {
  searchParams: Promise<{
    demo?: string;
    mode?: string;
  }>;
}
export default async function SeriesDetailsPage({ searchParams }: SerieDetailsProps) {
  const params = await searchParams;
  const demo = params?.demo === "true";
  const torrentMode = params?.mode === "torrent";

  return <SeriesDetails demoMode={demo} torrentMode={torrentMode} />;
}
