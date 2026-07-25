import { redirect } from "next/navigation";
import { Card, CardHeader } from "@/components/ui";
import PropertyForm from "@/components/property-form";
import { createProperty } from "@/lib/actions/properties";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Objekt anlegen" };

export default async function NewPropertyPage() {
  const profile = await requireProfile();
  if (profile.role === "viewer") redirect("/objekte");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Objekt anlegen</h1>

      <Card>
        <CardHeader
          title="Stammdaten"
          description="Mietbeginn und Laufzeit bestimmen, wann welche Rate fällig wird."
        />
        <div className="p-5">
          <PropertyForm action={createProperty} showInitialRent />
        </div>
      </Card>
    </div>
  );
}
