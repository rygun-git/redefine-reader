import { Skeleton } from "@/components/ui/skeleton"

export default function DisplaySettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Skeleton className="h-10 w-10 rounded-full mr-2" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full rounded-lg" />

        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
