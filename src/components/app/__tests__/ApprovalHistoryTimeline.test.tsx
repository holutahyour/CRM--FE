import { render, screen } from '@testing-library/react';
import ApprovalHistoryTimeline from '../ApprovalHistoryTimeline';
import { IApprovalRecord } from '@/data/interface/IWorkflow';

const mockRecords: IApprovalRecord[] = [
  { id: '1', stepOrder: 1, stepName: 'Supervisor', actionedByName: 'Sarah Smith',
    actionedOn: '2026-01-31T10:00:00', status: 'Approved' },
  { id: '2', stepOrder: 2, stepName: 'Manager', actionedByName: 'John Doe',
    actionedOn: '2026-02-02T10:30:00', status: 'Rejected', notes: 'Budget exceeded.' },
];

describe('ApprovalHistoryTimeline', () => {
  it('renders all history entries', () => {
    render(<ApprovalHistoryTimeline records={mockRecords} />);
    expect(screen.getByText('Supervisor: Approved')).toBeInTheDocument();
    expect(screen.getByText('Manager: Rejected')).toBeInTheDocument();
  });

  it('renders actioned-by names', () => {
    render(<ApprovalHistoryTimeline records={mockRecords} />);
    expect(screen.getByText(/Sarah Smith/)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('renders rejection notes in red', () => {
    render(<ApprovalHistoryTimeline records={mockRecords} />);
    const notes = screen.getByText('Budget exceeded.');
    expect(notes).toHaveClass('text-red-500');
  });
});
