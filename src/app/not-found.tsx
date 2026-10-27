import { PageNotFound } from "@/components/shell/unavailable";

// The 404 renders the chrome-only shell, so it needs no session and stays
// prerenderable: no cookies, no profile query, no clock.
export default function NotFound() {
  return <PageNotFound />;
}
