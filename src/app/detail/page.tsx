import { DetailRecordPage } from "@/components/document-record/detail-record";

// `/detail?stage=n` deep-links a stage (the overview's lifecycle links here).
// `?idea=` carries the idea described in a chat, so the record opens with it.
export default async function DetailPage({ searchParams }: { searchParams: Promise<{ stage?: string; idea?: string }> }) {
  const { stage, idea } = await searchParams;
  const index = Number(stage);
  return <DetailRecordPage initialStageIndex={Number.isInteger(index) ? index : undefined} initialIdea={idea} />;
}
