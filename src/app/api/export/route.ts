import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      workspace: {
        include: {
          items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          goals: true,
          timeSessions: { orderBy: { startTime: "asc" } },
        },
      },
    },
  });

  if (!user?.workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Kairos",
    profile: {
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      weekStartsOn: user.weekStartsOn,
    },
    workspace: {
      name: user.workspace.name,
      icon: user.workspace.icon,
      items: user.workspace.items.map((item) => ({
        id: item.id,
        parentId: item.parentId,
        name: item.name,
        type: item.type,
        description: item.description,
        color: item.color,
        archivedAt: item.archivedAt,
        createdAt: item.createdAt,
      })),
      goals: user.workspace.goals.map((goal) => ({
        id: goal.id,
        itemId: goal.itemId,
        name: goal.name,
        targetSeconds: goal.targetSeconds,
        periodType: goal.periodType,
        daysOfWeek: goal.daysOfWeek,
        startDate: goal.startDate,
        endDate: goal.endDate,
        status: goal.status,
        targetHistory: goal.targetHistory,
      })),
      timeSessions: user.workspace.timeSessions.map((entry) => ({
        id: entry.id,
        itemId: entry.itemId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        durationSeconds: entry.durationSeconds,
        description: entry.description,
        source: entry.source,
      })),
    },
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kairos-export-${date}.json"`,
    },
  });
}
