import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesPage from '../page';

const push = jest.fn();
let currentParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/sales',
  useSearchParams: () => currentParams,
}));

jest.mock('@/data/api/ApiHandler', () => ({
  __esModule: true,
  default: { sales: {} },
}));

function renderAt(search: string) {
  currentParams = new URLSearchParams(search);
  return render(<SalesPage />);
}

/** The table row whose first cell is the given date. */
function rowFor(date: string) {
  const cell = screen.getAllByText(date)[0];
  return cell.closest('tr') as HTMLElement;
}

beforeEach(() => {
  push.mockClear();
});

describe('SalesPage', () => {
  it('shows the five sections with Daily Production selected by default', () => {
    renderAt('');

    expect(screen.getByRole('heading', { name: 'Sales Department' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Daily Production' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    ['Sales', 'Feed Cost', 'Stock', 'Dashboard'].forEach((label) => {
      expect(screen.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('switches tab through the URL', async () => {
    renderAt('');

    await userEvent.click(screen.getByRole('tab', { name: 'Feed Cost' }));

    expect(push).toHaveBeenCalledWith('/sales?tab=feed-cost', { scroll: false });
  });

  it('derives total loss and good eggs on the production table', () => {
    renderAt('');

    // 420 total - (8 cracked + 4 bad) - 20 small = 388 good, 12 lost
    const row = rowFor('2026-06-01');
    expect(within(row).getByText('12')).toBeInTheDocument();
    expect(within(row).getByText('388')).toBeInTheDocument();
  });

  it('derives sale total and outstanding balance', () => {
    renderAt('tab=sales');

    // 5 crates x 1,750 = 8,750 total, 5,000 paid -> 3,750 outstanding
    const row = rowFor('2026-06-02');
    expect(within(row).getByText('Local Market')).toBeInTheDocument();
    expect(within(row).getByText('₦8,750')).toBeInTheDocument();
    expect(within(row).getByText('₦3,750')).toBeInTheDocument();
  });

  it('derives feed total cost', () => {
    renderAt('tab=feed-cost');

    // 10 bags x 12,000 = 120,000
    const row = rowFor('2026-06-01');
    expect(within(row).getByText('Layers Mash')).toBeInTheDocument();
    expect(within(row).getByText('₦120,000')).toBeInTheDocument();
  });

  it('derives closing stock in eggs and crates', () => {
    renderAt('tab=stock');

    // 248 opening + 410 produced - 300 sold - 8 lost = 350 eggs -> 13 crates
    const row = rowFor('2026-06-02');
    expect(within(row).getByText('350')).toBeInTheDocument();
    expect(within(row).getByText('13')).toBeInTheDocument();
  });

  it('summarises every module on the dashboard', () => {
    renderAt('tab=dashboard');

    expect(screen.getByText('Total Produced')).toBeInTheDocument();
    // 420 + 410 eggs — shown both as a stat tile and in the module summary
    expect(screen.getAllByText('830')).toHaveLength(2);
    expect(screen.getAllByText('₦26,750').length).toBeGreaterThan(0);  // 18,000 + 8,750
    expect(screen.getAllByText('₦167,500').length).toBeGreaterThan(0); // 120,000 + 47,500
    expect(screen.getAllByText('775').length).toBeGreaterThan(0);    // 388 + 387 good eggs
    expect(screen.getAllByText('₦3,750').length).toBeGreaterThan(0);   // outstanding
    expect(screen.getByText('350 eggs')).toBeInTheDocument();        // latest closing stock
  });

  it('adds a production record from the modal', async () => {
    renderAt('production_modal=true');

    await userEvent.type(screen.getByLabelText(/^Date/), '2026-06-03');
    await userEvent.clear(screen.getByLabelText('Total Eggs'));
    await userEvent.type(screen.getByLabelText('Total Eggs'), '400');
    await userEvent.clear(screen.getByLabelText('Cracked'));
    await userEvent.type(screen.getByLabelText('Cracked'), '10');

    // Good eggs is computed live: 400 - 10 = 390
    expect(screen.getByLabelText('Good Eggs (auto-calculated)')).toHaveValue(390);

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add Record' })
    );

    await waitFor(() => expect(rowFor('2026-06-03')).toBeInTheDocument());
    expect(within(rowFor('2026-06-03')).getByText('390')).toBeInTheDocument();
  });

  it('refuses a production record with no date', async () => {
    renderAt('production_modal=true');

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add Record' })
    );

    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('deletes a sales record', async () => {
    renderAt('tab=sales');

    expect(screen.getByText('XYZ Restaurant')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete sale to XYZ Restaurant on 2026-06-01' })
    );

    await waitFor(() => expect(screen.queryByText('XYZ Restaurant')).not.toBeInTheDocument());
    expect(screen.getByText('Local Market')).toBeInTheDocument();
  });
});
