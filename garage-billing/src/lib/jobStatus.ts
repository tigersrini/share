/**
 * Display labels for the garage's service progression. The underlying enum
 * values (OPEN/IN_PROGRESS/COMPLETED/BILLED) are unchanged in the database —
 * this is presentation only, so no data migration is needed to relabel.
 */
export const JOB_STATUS_LABELS = {
  OPEN: "Waiting",
  IN_PROGRESS: "In Service",
  COMPLETED: "Ready for Pickup",
  BILLED: "Delivered",
} as const;

export type JobStatus = keyof typeof JOB_STATUS_LABELS;

export const JOB_STATUS_TONE: Record<JobStatus, "zinc" | "orange" | "green" | "blue"> = {
  OPEN: "blue",
  IN_PROGRESS: "orange",
  COMPLETED: "green",
  BILLED: "zinc",
};

export const JOB_STATUS_ORDER: JobStatus[] = ["OPEN", "IN_PROGRESS", "COMPLETED", "BILLED"];
