import { z } from 'zod';

export const workflowStepSchema = z.object({
  stepName: z.string().min(1, 'Step name is required'),
  stepOrder: z.number().int().positive(),
  roleId: z.string().uuid('Role is required'),
  userId: z.string().uuid().optional().or(z.literal('')),
});

export const workflowTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  steps: z.array(workflowStepSchema).min(1, 'At least one step is required'),
});

export type WorkflowTemplateValues = z.infer<typeof workflowTemplateSchema>;
