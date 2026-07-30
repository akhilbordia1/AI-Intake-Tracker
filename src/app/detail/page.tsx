import { DetailRecordPage } from "@/components/document-record/detail-record";

// `/detail?stage=n` deep-links a stage (the overview's lifecycle rail links here).
export default async function DetailPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  const index = Number(stage);
  return <DetailRecordPage initialStageIndex={Number.isInteger(index) ? index : undefined} />;
}
