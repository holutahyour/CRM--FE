import { render, screen } from '@testing-library/react';
import ApprovalWorkflowStepper from '../ApprovalWorkflowStepper';

const steps = [
  { name: 'Supervisor', status: 'approved' as const },
  { name: 'Manager',    status: 'rejected' as const },
  { name: 'Finance',    status: 'waiting'  as const },
];

describe('ApprovalWorkflowStepper', () => {
  it('renders all step names', () => {
    render(<ApprovalWorkflowStepper steps={steps} />);
    expect(screen.getByText('Supervisor')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('applies green class to approved step', () => {
    render(<ApprovalWorkflowStepper steps={steps} />);
    const badge = screen.getByTestId('step-Supervisor');
    expect(badge).toHaveClass('bg-green-600');
  });

  it('applies red class to rejected step', () => {
    render(<ApprovalWorkflowStepper steps={steps} />);
    const badge = screen.getByTestId('step-Manager');
    expect(badge).toHaveClass('bg-red-500');
  });

  it('applies gray outline class to waiting step', () => {
    render(<ApprovalWorkflowStepper steps={steps} />);
    const badge = screen.getByTestId('step-Finance');
    expect(badge).toHaveClass('border-gray-300');
  });
});
