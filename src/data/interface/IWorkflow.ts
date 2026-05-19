export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type WorkflowStepStatus = 'approved' | 'rejected' | 'pending' | 'waiting';

export interface IWorkflowStep {
  id: string;
  stepOrder: number;
  stepName: string;
  roleId: string;
  roleName?: string;
  userId?: string;
  userName?: string;
}

export interface IApprovalRecord {
  id: string;
  stepOrder: number;
  stepName: string;
  actionedByName: string;
  actionedOn: string;
  status: ApprovalStatus;
  notes?: string;
}

export interface IApprovalHistory {
  workflowSteps: IWorkflowStep[];
  records: IApprovalRecord[];
  currentStepOrder: number;
}

export interface IWorkflowTemplate {
  id: string;
  workflowType: number;
  name: string;
  isActive: boolean;
  steps: IWorkflowStep[];
}

export interface IWorkflowStepRequest {
  stepName: string;
  stepOrder: number;
  roleId: string;
  userId?: string;
}
