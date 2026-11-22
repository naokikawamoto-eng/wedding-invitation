"use client";

import { AdminGate } from "@/components/admin/AdminGate";
import { RaceAdmin } from "@/components/race/RaceAdmin";

export default function RaceAdminPage() {
  return (
    <AdminGate>
      {() => (
        <main className="mx-auto max-w-5xl px-4 py-6">
          <RaceAdmin />
        </main>
      )}
    </AdminGate>
  );
}
