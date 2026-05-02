import { z } from "zod";

export const createRequisitionSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  // amount: z
  //   .number({ invalid_type_error: "Amount is required." })
  //   .positive({ message: "Amount must be greater than 0." }),
  amount: z.number(),
  description: z.string().optional(),
  departmentId: z.string().min(1, { message: "Department is required." }),
});

export type CreateRequisitionValues = z.infer<typeof createRequisitionSchema>;
