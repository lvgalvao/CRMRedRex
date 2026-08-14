import { SkeletonHeader, SkeletonKpis, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonHeader />
      <SkeletonKpis n={3} />
      <SkeletonList n={3} />
    </div>
  );
}
