import { redirect } from "next/navigation";

// The leadership views used to be a route of their own, with their own shell and a docked assistant.
// They are a tab of the tracker now (`/` → Leadership), so this stays only to keep the URL alive —
// it was the only way in while the view was being built, and a dead link is worse than a hop.
export default function PortfolioPage() {
  redirect("/?tab=leadership");
}
