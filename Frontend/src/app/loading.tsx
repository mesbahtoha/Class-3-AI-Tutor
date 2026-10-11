import { SkeletonList } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="py-8">
      <SkeletonList rows={4} />
    </div>
  );
}
