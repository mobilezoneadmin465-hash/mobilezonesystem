import { redirect } from "next/navigation";

/** Orders for reps are handled on To deliver. */
export default function SrOrdersRedirectPage() {
  redirect("/sr/to-deliver");
}
