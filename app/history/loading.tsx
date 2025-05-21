import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>

      <Skeleton className="h-10 w-full mb-6" />

      <div className="space-y-4">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
      </div>
    </div>
  )
}
