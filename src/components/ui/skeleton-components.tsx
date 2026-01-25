import { Loader2 } from 'lucide-react';

interface SkeletonProps {
  readonly count?: number;
}

export function TableSkeleton({ count = 5 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={String(i)} className="flex gap-4">
          <div className="h-10 bg-muted rounded animate-pulse flex-1" />
          <div className="h-10 bg-muted rounded animate-pulse flex-1" />
          <div className="h-10 bg-muted rounded animate-pulse w-32" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
