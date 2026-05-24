import { z } from "zod";

export const ApplyForJobDto = z.object({
  jobId: z.string().uuid("Invalid job ID"),
});

export const ChangeStatusDto = z.object({
  status: z.enum(["APPLIED", "SHORTLISTED", "REJECTED"]),
});

export type ApplyForJobInput = z.infer<typeof ApplyForJobDto>;
export type ChangeStatusInput = z.infer<typeof ChangeStatusDto>;
