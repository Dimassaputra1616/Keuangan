"use client";

import { useEffect } from "react";
import { IconAlert } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-6 text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-destructive-soft text-destructive">
        <IconAlert className="h-6 w-6" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        Terjadi kesalahan
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Halaman ini gagal dimuat. Coba muat ulang. Database mungkin belum siap:
        jalankan <code>npm run db:migrate</code> lalu{" "}
        <code>npm run db:seed</code>.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-subtle-foreground">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Muat ulang halaman
        </Button>
      </div>
    </Card>
  );
}