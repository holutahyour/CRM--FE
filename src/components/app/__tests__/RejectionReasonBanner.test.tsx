import { render, screen } from '@testing-library/react';
import RejectionReasonBanner from '../RejectionReasonBanner';

describe('RejectionReasonBanner', () => {
  it('renders the reason text when reason is provided', () => {
    render(<RejectionReasonBanner reason="Budget exceeded for this quarter." />);
    expect(screen.getByText('Budget exceeded for this quarter.')).toBeInTheDocument();
    expect(screen.getByText('Rejection Reason:')).toBeInTheDocument();
  });

  it('does not render when reason is undefined', () => {
    const { container } = render(<RejectionReasonBanner reason={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when reason is empty string', () => {
    const { container } = render(<RejectionReasonBanner reason="" />);
    expect(container.firstChild).toBeNull();
  });
});
