import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Feedback";

/**
 * Placeholder untuk berkas `loading.tsx`.
 *
 * `rows` mengatur perkiraan tinggi halaman: 3 untuk dashboard, 1 untuk
 * halaman formulir, 2 untuk halaman daftar.
 */
export function PageSkeleton({
  rows = 3,
  withFilters = false,
  withHero = false,
}: {
  rows?: number;
  withFilters?: boolean;
  withHero?: boolean;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {withHero ? (
        <div className="rounded-card bg-surface-muted p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="w-full max-w-xs space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <div className="flex gap-6">
              <div className="w-28 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="w-28 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          {/* `max-w` bukan `w-64`: pada viewport 320px, lebar tetap 256px
              hampir memakan seluruh layar dan bisa memaksa scroll. */}
          <Skeleton className="h-4 w-full max-w-64" />
        </div>
      )}

      {withFilters ? (
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </Card>
      ))}
    </div>
  );
}