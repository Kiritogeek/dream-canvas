import { useMutation, useQueryClient } from "@tanstack/react-query";
import { composeChapterLayout, type ComposeChapterLayoutParams } from "@/services/composeChapterLayout";

export function useComposeChapterLayout(chapterId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: ComposeChapterLayoutParams) => composeChapterLayout(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["panels", chapterId] });
    },
  });
}
