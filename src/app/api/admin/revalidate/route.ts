import { NextResponse } from "next/server";
import { invalidateCatalog } from "@/lib/revalidate-catalog";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "olivox2026!";

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(":");
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

// Golirea cache-ului de catalog ca cerere separata. O foloseste sincronizarea
// (/api/admin/sync/apply): acolo scrierile se fac in interiorul unui raspuns
// care curge (stream), dupa ce handler-ul a intors deja Response-ul, iar
// revalidateTag chemat atunci nu mai e garantat sa fie aplicat.
export async function POST(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  invalidateCatalog();
  return NextResponse.json({ success: true });
}
