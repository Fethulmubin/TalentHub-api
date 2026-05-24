import { z } from "zod";

export const CreateJobDto = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  skills: z.array(z.string().min(2)).nonempty("At least one skill is required"),
  price: z.number().min(0).optional(),
});

export const JobQueryDto = z.object({
  search: z.string().optional(),
  skill: z.string().optional(),
  title: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof CreateJobDto>;
export type JobQueryInput = z.infer<typeof JobQueryDto>;

export interface JobResponse {
  id: string;
  title: string;
  description: string;
  price: number | null;
  createdAt: Date;
  createdBy: { id: string; name: string; email: string };
  skills: { id: string; name: string }[];
}
