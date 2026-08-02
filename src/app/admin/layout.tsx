import type { Metadata } from "next";
import "./admin.css";

// The admin panel was serving `index, follow`. robots.txt only asks crawlers
// not to fetch it; noindex is what keeps it out of the index if it is ever
// linked from somewhere or already known to Google.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
