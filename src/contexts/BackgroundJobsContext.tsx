import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

type JobStatus = "running" | "done";

interface DetectJob {
  chapterNumber: number;
  status: JobStatus;
}

interface BackgroundJobsContextValue {
  jobs: Map<string, DetectJob>;
  startJob: (chapterId: string, chapterNumber: number) => void;
  completeJob: (chapterId: string) => void;
  clearJob: (chapterId: string) => void;
}

const BackgroundJobsContext = createContext<BackgroundJobsContextValue | null>(null);

export function BackgroundJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Map<string, DetectJob>>(new Map());

  const startJob = useCallback((chapterId: string, chapterNumber: number) => {
    setJobs(prev => new Map(prev).set(chapterId, { chapterNumber, status: "running" }));
  }, []);

  const completeJob = useCallback((chapterId: string) => {
    setJobs(prev => {
      const job = prev.get(chapterId);
      if (!job) return prev;
      return new Map(prev).set(chapterId, { ...job, status: "done" });
    });
  }, []);

  const clearJob = useCallback((chapterId: string) => {
    setJobs(prev => {
      if (!prev.has(chapterId)) return prev;
      const next = new Map(prev);
      next.delete(chapterId);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ jobs, startJob, completeJob, clearJob }),
    [jobs, startJob, completeJob, clearJob],
  );

  return (
    <BackgroundJobsContext.Provider value={value}>
      {children}
    </BackgroundJobsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBackgroundJobs() {
  const ctx = useContext(BackgroundJobsContext);
  if (!ctx) throw new Error("useBackgroundJobs doit être utilisé dans BackgroundJobsProvider");
  return ctx;
}
