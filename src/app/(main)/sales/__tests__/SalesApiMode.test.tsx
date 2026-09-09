// The Sales tabs talk to the API whenever NEXT_PUBLIC_DISABLE_MOCK_DATA is set,
// which is how dev and Docker run. These cover that path: a record reaches the
// table only once the API confirms it was stored, and a refusal is explained in
// the form rather than swallowed.
process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA = 'true';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Required lazily: `use-sales-data` reads the env flag at module load, and a
// top-level import would be hoisted above the assignment above.
const SalesPage = require('../page').default;
const apiHandler = require('@/data/api/ApiHandler').default;

const push = jest.fn();
let currentParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/sales',
  useSearchParams: () => currentParams,
}));

jest.mock('@/data/api/ApiHandler', () => ({
  __esModule: true,
  default: {
    sales: {
      listProduction: jest.fn(),
      listSales: jest.fn(),
      listFeedCosts: jest.fn(),
      listStock: jest.fn(),
      createProduction: jest.fn(),
      createSale: jest.fn(),
      createFeedCost: jest.fn(),
      createStock: jest.fn(),
    },
  },
}));

const api = apiHandler.sales;
const emptyList = () => Promise.resolve({ isSuccess: true, content: [] });

function renderAt(search: string) {
  currentParams = new URLSearchParams(search);
  return render(<SalesPage />);
}

const dialog = () => screen.getByRole('dialog');

const fill = async (label: string | RegExp, value: string) => {
  const el = screen.getByLabelText(label);
  await userEvent.clear(el);
  await userEvent.type(el, value);
};

/** Fills the Sales form with a valid ₦100 cash sale to the given customer. */
async function fillSale(customer: string) {
  await fill(/^Date/, '2026-06-05');
  await fill(/^Customer/, customer);
  await fill('Quantity (crates)', '1');
  await fill(/^Price/, '100');
  await fill(/^Paid/, '100');
  await userEvent.selectOptions(screen.getByLabelText(/^Mode of Payment/), 'Cash');
}

const submit = () =>
  userEvent.click(within(dialog()).getByRole('button', { name: 'Add Record' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  [api.listProduction, api.listSales, api.listFeedCosts, api.listStock].forEach((f: jest.Mock) =>
    f.mockImplementation(emptyList)
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('creating against the API', () => {
  it('adds the record the API returns', async () => {
    api.createSale.mockResolvedValue({
      isSuccess: true,
      content: {
        id: 'srv-1', date: '2026-06-05', customer: 'Server Buyer',
        quantity: 1, price: 100, paid: 100, modeOfPayment: 'Cash',
      },
    });
    renderAt('tab=sales&sale_modal=true');
    await waitFor(() => expect(screen.getByText('No sales records yet.')).toBeInTheDocument());

    await fillSale('Typed Buyer');
    await submit();

    // The row comes from the API response, not from what was typed.
    await waitFor(() => expect(screen.getByText('Server Buyer')).toBeInTheDocument());
    // The modal closes by dropping its query param.
    expect(push).toHaveBeenCalledWith('/sales?tab=sales', { scroll: false });
  });

  it('keeps a refused record out of the table and shows the reason', async () => {
    api.createSale.mockResolvedValue({
      isSuccess: false,
      message: 'Customer credit limit exceeded',
    });
    renderAt('tab=sales&sale_modal=true');
    await waitFor(() => expect(screen.getByText('No sales records yet.')).toBeInTheDocument());

    await fillSale('Rejected Buyer');
    await submit();

    await waitFor(() =>
      expect(within(dialog()).getByText('Customer credit limit exceeded')).toBeInTheDocument()
    );
    expect(screen.queryByText('Rejected Buyer')).not.toBeInTheDocument();
    expect(screen.getByText('No sales records yet.')).toBeInTheDocument();
    // The form stays open so the entry is not lost.
    expect(push).not.toHaveBeenCalled();
  });

  it('reports a failed request without losing the typed record', async () => {
    api.createSale.mockRejectedValue(new Error('Request failed with status code 404'));
    renderAt('tab=sales&sale_modal=true');
    await waitFor(() => expect(screen.getByText('No sales records yet.')).toBeInTheDocument());

    await fillSale('Ghost Buyer');
    await submit();

    await waitFor(() =>
      expect(within(dialog()).getByText(/could not be saved/i)).toBeInTheDocument()
    );
    expect(screen.queryByText('Ghost Buyer')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    // The typed values survive so the user can retry.
    expect(screen.getByLabelText(/^Customer/)).toHaveValue('Ghost Buyer');
  });

  it('clears the previous error once a retry succeeds', async () => {
    api.createSale
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        isSuccess: true,
        content: {
          id: 'srv-2', date: '2026-06-05', customer: 'Retry Buyer',
          quantity: 1, price: 100, paid: 100, modeOfPayment: 'Cash',
        },
      });
    renderAt('tab=sales&sale_modal=true');
    await waitFor(() => expect(screen.getByText('No sales records yet.')).toBeInTheDocument());

    await fillSale('Retry Buyer');
    await submit();
    await waitFor(() =>
      expect(within(dialog()).getByText(/could not be saved/i)).toBeInTheDocument()
    );

    await submit();

    await waitFor(() => expect(screen.getByText('Retry Buyer')).toBeInTheDocument());
    expect(screen.queryByText(/could not be saved/i)).not.toBeInTheDocument();
  });

  it('applies the same rule to the other three forms', async () => {
    api.createProduction.mockResolvedValue({ isSuccess: false, message: 'Day already closed' });
    renderAt('production_modal=true');
    await waitFor(() => expect(screen.getByText('No production records yet.')).toBeInTheDocument());

    await fill(/^Date/, '2026-06-05');
    await fill('Total Eggs', '400');
    await submit();

    await waitFor(() =>
      expect(within(dialog()).getByText('Day already closed')).toBeInTheDocument()
    );
    expect(screen.getByText('No production records yet.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
