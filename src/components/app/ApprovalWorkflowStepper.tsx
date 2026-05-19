import { WorkflowStepStatus } from '@/data/interface/IWorkflow';

interface Step {
  name: string;
  status: WorkflowStepStatus;
}

const statusStyles: Record<WorkflowStepStatus, string> = {
  approved: 'bg-green-600 text-white',
  rejected: 'bg-red-500 text-white',
  pending:  'bg-yellow-400 text-white',
  waiting:  'bg-white text-gray-500 border border-gray-300',
};

interface Props {
  steps: Step[];
}

export default function ApprovalWorkflowStepper({ steps }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.name} className="flex items-center gap-2">
          <span
            data-testid={`step-${step.name}`}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[step.status]}`}
          >
            {step.name}
          </span>
          {i < steps.length - 1 && <span className="text-gray-400 text-xs">›</span>}
        </div>
      ))}
    </div>
  );
}
