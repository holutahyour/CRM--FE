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

const sections = () => screen.getByRole('tablist', { name: 'Fresh Produce sections' });
const dialog = () => screen.getByRole('dialog');
const submit = (name = 'Add Record') =>
  userEvent.click(within(dialog()).getByRole('button', { name }));

const fill = async (label: string | RegExp, value: string) => {
  const el = screen.getByLabelText(label);
  await userEvent.clear(el);
  await userEvent.type(el, value);
};

function rowFor(text: string) {
  return screen.getAllByText(text)[0].closest('tr') as HTMLElement;
}

beforeEach(() => {
  push.mockClear();
});

describe('Sales division switch', () => {
  it('opens on EPL Poultry and switches to Fresh Produce through the URL', async () => {
    renderAt('');

    const divisions = screen.getByRole('tablist', { name: 'Division' });
    expect(within(divisions).getByRole('tab', { name: 'EPL Poultry' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await userEvent.click(within(divisions).getByRole('tab', { name: 'Fresh Produce' }));

    // A new division drops the poultry tab so it opens on its own first section.
    expect(push).toHaveBeenCalledWith('/sales?division=produce', { scroll: false });
  });

  it('shows the four produce sections with Packhouse Intake first', () => {
    renderAt('division=produce');

    expect(within(sections()).getByRole('tab', { name: 'Packhouse Intake' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    ['Summary', 'Sales', 'Weekly Sales Summary'].forEach((label) =>
      expect(within(sections()).getByRole('tab', { name: label })).toBeInTheDocument()
    );
  });

  it('keeps the division when switching produce section', async () => {
    renderAt('division=produce');

    await userEvent.click(within(sections()).getByRole('tab', { name: 'Summary' }));

    expect(push).toHaveBeenCalledWith('/sales?division=produce&tab=summary', { scroll: false });
  });

  it('ignores a poultry-only tab under Fresh Produce', () => {
    renderAt('division=produce&tab=feed-cost');

    expect(within(sections()).getByRole('tab', { name: 'Packhouse Intake' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});

describe('Fresh Produce tabs', () => {
  it('derives accepted weight on the intake table', () => {
    renderAt('division=produce');

    // 150 A + 100 B + 50 C = 300 accepted
    expect(within(rowFor('2026-06-01')).getByText('300')).toBeInTheDocument();
  });

  it('summarises intake and sales', () => {
    renderAt('division=produce&tab=summary');

    // 300 + 270 accepted, 20 + 10 rejected — each shown as a tile and a breakdown row
    expect(screen.getAllByText('570')).toHaveLength(2);
    expect(screen.getAllByText('30')).toHaveLength(4); // rejected + spoilage
    expect(screen.getAllByText('200')).toHaveLength(2); // 80 + 120 kg sold
    // 80 x 2,500 + 120 x 1,800
    expect(screen.getAllByText('₦416,000')).toHaveLength(2);
    expect(screen.getByText('Paid: ₦300,000 · Bal: ₦116,000')).toBeInTheDocument();
  });

  it('derives sale total and balance', () => {
    renderAt('division=produce&tab=sales');

    const row = rowFor('Green Fresh Market');
    expect(within(row).getByText('₦216,000')).toBeInTheDocument();
    expect(within(row).getByText('₦116,000')).toBeInTheDocument();
    expect(within(row).getByText('Outstanding')).toBeInTheDocument();
  });

  it('shows weekly records with the all-weeks dashboard', () => {
    renderAt('division=produce&tab=weekly-summary');

    expect(within(rowFor('2026-06-07')).getByText('₦116,000')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue (All Weeks)')).toBeInTheDocument();
    expect(screen.getByText('Revenue by Product Category')).toBeInTheDocument();
  });
});

describe('Fresh Produce forms', () => {
  it('adds an intake record with accepted weight worked out live', async () => {
    renderAt('division=produce&packhouse_intake_modal=true');

    await fill(/^Date/, '2026-06-03');
    await fill(/^Produce Type/, 'Tomato');
    await fill('Grade A (kg)', '40');
    await fill('Grade B (kg)', '25');
    await fill('Rejected (kg)', '5');

    expect(screen.getByLabelText('Accepted (kg) — auto')).toHaveValue(65);
    expect(screen.getByLabelText('Rejected (kg) — reflected')).toHaveValue(5);

    await submit();

    await waitFor(() => expect(rowFor('Tomato')).toBeInTheDocument());
    expect(within(rowFor('Tomato')).getByText('65')).toBeInTheDocument();
  });

  it('refuses an intake whose grades outweigh the harvest', async () => {
    renderAt('division=produce&packhouse_intake_modal=true');

    await fill(/^Date/, '2026-06-03');
    await fill(/^Produce Type/, 'Tomato');
    await fill('Grade A (kg)', '100');
    await fill('Quantity Harvested (kg)', '50');
    await submit();

    expect(screen.getByText(/exceeds the harvest/)).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
  });

  it('refuses a sale marked Fully Paid while a balance is owed', async () => {
    renderAt('division=produce&tab=sales&produce_sale_modal=true');

    await fill(/^Date/, '2026-06-03');
    await fill(/^Customer/, 'Late Payer');
    await userEvent.selectOptions(screen.getByLabelText(/^Product Category/), 'Habanero');
    await fill('Qty Sold (kg)', '10');
    await fill(/^Price\/kg/, '1000');
    await fill(/^Paid \(/, '4000');
    await userEvent.selectOptions(screen.getByLabelText(/^Remarks \(Payment Mode\)/), 'Cash');
    await userEvent.selectOptions(screen.getByLabelText(/^Payment Status/), 'Fully Paid');

    expect(screen.getByLabelText('Balance (₦) — auto')).toHaveValue(6000);
    await submit();

    expect(screen.getByText('A balance of ₦6,000 is still owed')).toBeInTheDocument();
    expect(screen.queryByText('Late Payer', { selector: 'td' })).not.toBeInTheDocument();
  });

  it('refuses a week that ends before it starts', async () => {
    renderAt('division=produce&tab=weekly-summary&produce_week_modal=true');

    await fill(/^Week Start/, '2026-06-08');
    await fill(/^Week End/, '2026-06-01');
    await submit('Add Week');

    expect(screen.getByText('Week end cannot be before week start')).toBeInTheDocument();
  });

  it('adds a week with its balance derived', async () => {
    renderAt('division=produce&tab=weekly-summary&produce_week_modal=true');

    await fill(/^Week Start/, '2026-06-08');
    await fill(/^Week End/, '2026-06-14');
    await fill(/^Total Sales/, '500000');
    await fill(/^Total Paid/, '450000');
    expect(screen.getByLabelText('Balance (₦) — auto')).toHaveValue(50000);

    await submit('Add Week');

    await waitFor(() => expect(rowFor('2026-06-14')).toBeInTheDocument());
    expect(within(rowFor('2026-06-14')).getByText('₦50,000')).toBeInTheDocument();
  });
});
