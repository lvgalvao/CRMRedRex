import { SkeletonHeader, SkeletonKpis, SkeletonKanban, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonHeader />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-32 lg:col-span-2" />
        <Skeleton className="h-32" />
      </div>
      <SkeletonKpis />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <SkeletonKanban />
      </div>
    </div>
  );
}
