import { Suspense } from "react";
import { TournamentScreen } from "@/features/tournament/TournamentScreen";

// useSearchParams needs a Suspense boundary in a static export.
export default function TournamentPage() {
  return (
    <Suspense>
      <TournamentScreen />
    </Suspense>
  );
}
