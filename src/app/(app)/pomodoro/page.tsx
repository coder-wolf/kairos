import { redirect } from "next/navigation";

export default function LegacyPomodoroPage() {
  redirect("/timer?mode=pomodoro");
}
