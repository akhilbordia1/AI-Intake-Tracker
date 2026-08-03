import { DetailRecordPage } from "@/components/document-record/detail-record";

// `/detail?stage=n` deep-links a stage (the overview's lifecycle links here).
// `?idea=` carries the idea described in a chat, so the record opens with it.
// `?blank=1` opens the same twelve stages with nothing captured — the empty state, walkable
// end to end. One board card (UC-141) points here, so the blank record is reachable from
// the tracker rather than only by typing the URL.
export default async function DetailPage({ searchParams }: { searchParams: Promise<{ stage?: string; idea?: string; blank?: string }> }) {
  const { stage, idea, blank } = await searchParams;
  const index = Number(stage);
  return <DetailRecordPage initialStageIndex={Number.isInteger(index) ? index : undefined} initialIdea={idea} blank={blank === "1"} />;
}
