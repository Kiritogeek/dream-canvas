import { useQuery } from "@tanstack/react-query";
import {
  chapterCanvasImageHistoryQueryKey,
  fetchChapterCanvasImageHistory,
} from "@/services/chapterCanvasImageHistory";

export function useChapterCanvasImageHistory(chapterId: string | undefined) {
  return useQuery({
    queryKey: chapterId ? chapterCanvasImageHistoryQueryKey(chapterId) : ["chapter-canvas-image-history", "__pending"],
    queryFn: () => fetchChapterCanvasImageHistory(chapterId!),
    enabled: !!chapterId,
  });
}
