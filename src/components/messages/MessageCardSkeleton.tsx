
"use client";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // Assuming you have a Skeleton component from shadcn/ui

export function MessageCardSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start space-x-3 p-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-20 w-full rounded-md" /> {/* Placeholder for potential media */}
      </CardContent>
      <CardFooter className="px-4 py-3 border-t flex justify-start gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </CardFooter>
    </Card>
  );
}

