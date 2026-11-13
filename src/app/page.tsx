import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    const exists = await db.user.findUnique({ where: { id: session.userId }, select: { id: true } });
    if (exists) redirect("/dashboard");
  }
  redirect("/login");
}
