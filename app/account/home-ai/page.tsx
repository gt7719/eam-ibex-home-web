import { redirect } from "next/navigation";

export default function HomeAiAccountPage() {
  redirect("/account?home_ai=1");
}
