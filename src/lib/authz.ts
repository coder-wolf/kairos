import "server-only";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./dal";

export async function requireWorkspace() {
  const user = await getCurrentUser();
  return { user, workspace: user.workspace! };
}

export function revalidateApp() {
  revalidatePath("/", "layout");
}
