import { TrackerView } from "@/app/tracker-view";

// The tracker itself is a client component (`tracker-view.tsx`); this thin server page
// exists only to read the URL. `/?phase=Delivery` opens the board narrowed to one
// lifecycle phase — the portfolio's pipeline rows link here, so a count on the
// leadership view can be opened rather than counted again by hand.
//
// `/?tab=leadership` opens the committee's read. It's what the retired `/portfolio` route redirects
// to, and it means a leadership view can be linked to rather than clicked to.
export default async function HomePage({ searchParams }: { searchParams: Promise<{ phase?: string; tab?: string }> }) {
  const { phase, tab } = await searchParams;
  return <TrackerView initialPhase={phase} initialTab={tab} />;
}
