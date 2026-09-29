// Operations → Processing talks to the API whenever NEXT_PUBLIC_DISABLE_MOCK_DATA is set,
// which is how dev and Docker run. These cover that path: records come from the API, a
// save reaches the table only once the API confirms it, and a refusal (HTTP 400) is
// explained in the form rather than swallowed.
process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA = 'true';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Required lazily: the data hooks read the env flag at module load, and a top-level
// import would be hoisted above the assignment above.
const OperationsPage = require('../page').default;
const apiHandler = require('@/data/api/ApiHandler').default;

const push = jest.fn();
let currentParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/operations',
  useSearchParams: () => currentParams,
}));

jest.mock('@/data/api/ApiHandler', () => ({
  __esModule: true,
  default: {
    operations: {
      listProducts: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      listOrderRequests: jest.fn(),
      createOrderRequest: jest.fn(),
      updateOrderRequest: jest.fn(),
      deleteOrderRequest: jest.fn(),
      listBatches: jest.fn(),
      createBatch: jest.fn(),
      updateBatch: jest.fn(),
      deleteBatch: jest.fn(),
      listYieldEntries: jest.fn(),
      createYieldEntry: jest.fn(),
      updateYieldEntry: jest.fn(),
      deleteYieldEntry: jest.fn(),
      listStockCards: jest.fn(),
      getStockCard: jest.fn(),
      receiveStock: jest.fn(),
      issueStock: jest.fn(),
      listMachineUsageLogs: jest.fn(),
      createMachineUsageLog: jest.fn(),
    },
  },
}));

const api = apiHandler.operations;
const ok = (content: unknown) => Promise.resolve({ isSuccess: true, content });
const refused = (message: string) =>
  Promise.reject({ response: { status: 400, data: { isSuccess: false, message } } });

const RAW = 'Processing – Raw Produce';
const PACKAGING = 'Processing – Packaging & Supplies';

const hibiscusBatch = {
  id: 'batch-1',
  batchCode: 'HI925001',
  customerCode: 'CUS-00359',
  customerName: 'Odun African Fine Foods',
  productNames: 'Dehydrated hibiscus cut flowers',
  productCode: 'SFL/001/HIG3/0925/001',
  quantity: 5000,
  quantityUnit: 'kg',
  startDate: '2025-10-09',
  endDate: '2025-11-09',
  workCenters: 'Packaging Area',
  operators: 'Kareem',
  status: 'Complete',
};

const habanero = {
  id: 'item-hab', name: 'Red Habanero', sku: 'PROC-0010', categoryName: RAW,
  unitType: 'kg', locationName: 'Main Store', quantityOnHand: 0,
};
const nylon = {
  id: 'item-tpn', name: 'Tamper Proof Nylon', sku: 'OTHR-0842', categoryName: PACKAGING,
  unitType: 'pcs', locationName: 'Packaging Store', quantityOnHand: 6,
};

function renderAt(search: string) {
  currentParams = new URLSearchParams(search);
  return render(<OperationsPage />);
}

const dialog = () => screen.getByRole('dialog');

const fill = async (label: string | RegExp, value: string) => {
  const el = within(dialog()).getByLabelText(label);
  await userEvent.clear(el);
  await userEvent.type(el, value);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  [
    api.listProducts, api.listOrderRequests, api.listBatches, api.listYieldEntries,
    api.listStockCards, api.listMachineUsageLogs,
  ].forEach((f: jest.Mock) => f.mockImplementation(() => ok([])));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Batch Scheduling (API)', () => {
  it('lists the batches the API returns', async () => {
    api.listBatches.mockImplementation(() => ok([hibiscusBatch]));

    renderAt('tab=processing&sub=batch-scheduling');

    const row = (await screen.findByText('HI925001')).closest('tr') as HTMLElement;
    expect(within(row).getByText('Odun African Fine Foods')).toBeInTheDocument();
    expect(within(row).getByText('SFL/001/HIG3/0925/001')).toBeInTheDocument();
    expect(within(row).getByText('Complete')).toBeInTheDocument();
  });

  it('adds a batch once the API confirms it', async () => {
    api.createBatch.mockImplementation((data: any) => ok({ ...data, id: 'batch-new' }));
    renderAt('tab=processing&sub=batch-scheduling&batch_modal=true');
    await screen.findByRole('dialog', { name: 'Add Batch' });

    await fill(/^Product Names/, 'Ginger powder');
    await fill(/^Start Date/, '2026-09-01');
    await fill(/^End Date/, '2026-09-02');
    await userEvent.selectOptions(within(dialog()).getByLabelText(/^Status/), 'In Progress');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save Batch' }));

    await waitFor(() => expect(api.createBatch).toHaveBeenCalledTimes(1));
    expect(api.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        productNames: 'Ginger powder',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        status: 'InProgress',
        batchCode: null,
        quantity: null,
      })
    );
    expect(await within(screen.getByRole('table')).findByText('Ginger powder')).toBeInTheDocument();
  });

  it("shows the API's reason when it refuses a batch, and adds no row", async () => {
    api.createBatch.mockImplementation(() => refused('Order request not found.'));
    renderAt('tab=processing&sub=batch-scheduling&batch_modal=true');
    await screen.findByRole('dialog', { name: 'Add Batch' });

    await fill(/^Product Names/, 'Ginger powder');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save Batch' }));

    expect(await within(dialog()).findByText('Order request not found.')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Ginger powder')).not.toBeInTheDocument();
  });

  it('refuses an end date before the start date without calling the API', async () => {
    renderAt('tab=processing&sub=batch-scheduling&batch_modal=true');
    await screen.findByRole('dialog', { name: 'Add Batch' });

    await fill(/^Product Names/, 'Ginger powder');
    await fill(/^Start Date/, '2026-09-05');
    await fill(/^End Date/, '2026-09-01');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save Batch' }));

    expect(await within(dialog()).findByText('End date must be on or after the start date')).toBeInTheDocument();
    expect(api.createBatch).not.toHaveBeenCalled();
  });

  it('opens a batch for editing and saves the change', async () => {
    api.listBatches.mockImplementation(() => ok([hibiscusBatch]));
    api.updateBatch.mockImplementation(() => ok(true));
    renderAt('tab=processing&sub=batch-scheduling');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit batch HI925001' }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('batch_modal=batch-1'), { scroll: false });
  });

  it('pre-fills the edit form and sends the update', async () => {
    api.listBatches.mockImplementation(() => ok([hibiscusBatch]));
    api.updateBatch.mockImplementation(() => ok(true));
    renderAt('tab=processing&sub=batch-scheduling&batch_modal=batch-1');

    await screen.findByRole('dialog', { name: 'Edit Batch' });
    await waitFor(() => expect(within(dialog()).getByLabelText(/^Batch ID/)).toHaveValue('HI925001'));
    await fill(/^Operator\(s\)/, 'Ms Joy');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save Batch' }));

    await waitFor(() =>
      expect(api.updateBatch).toHaveBeenCalledWith(
        'batch-1',
        expect.objectContaining({ operators: 'Ms Joy', batchCode: 'HI925001', status: 'Complete' })
      )
    );
    expect(await within(screen.getByRole('table')).findByText('Ms Joy')).toBeInTheDocument();
  });
});

describe('Order Requests (API)', () => {
  it('needs a customer name before anything is sent', async () => {
    renderAt('tab=processing&sub=order-requests&order_request_modal=true');
    await screen.findByRole('dialog', { name: 'Add Order Request' });

    await fill(/^Request Date/, '2026-01-16');
    await fill(/^Products/, 'Habanero pepper');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save Order Request' }));

    expect(await within(dialog()).findByText('Customer Name is required')).toBeInTheDocument();
    expect(api.createOrderRequest).not.toHaveBeenCalled();
  });
});

describe('Yield Log (API)', () => {
  it('names the produce and shows the computed yield', async () => {
    api.listStockCards.mockImplementation(() => ok([habanero]));
    api.listYieldEntries.mockImplementation(() =>
      ok([{ id: 'y1', date: '2026-01-16', produceItemId: 'item-hab', inputQuantity: 1346.62,
            inputUnit: 'kg', dehydratedWeightKg: 121, grindWeightKg: 115.71 }])
    );

    renderAt('tab=processing&sub=yield-log');

    const row = (await screen.findByText('Red Habanero', { selector: 'td' })).closest('tr') as HTMLElement;
    expect(within(row).getByText('8.6%')).toBeInTheDocument();
  });
});

describe('Material Stock (API)', () => {
  it('groups the materials by category', async () => {
    api.listStockCards.mockImplementation(() => ok([habanero, nylon]));

    renderAt('tab=processing&sub=material-stock');

    const nylonButton = await screen.findByRole('button', { name: 'Open stock card for Tamper Proof Nylon' });
    const section = (heading: string) => screen.getByRole('heading', { name: heading }).closest('section') as HTMLElement;
    expect(within(section(PACKAGING)).getByText('Tamper Proof Nylon')).toBeInTheDocument();
    expect(within(section(RAW)).getByText('Red Habanero')).toBeInTheDocument();
    expect(within(section(RAW)).queryByText('Tamper Proof Nylon')).not.toBeInTheDocument();

    await userEvent.click(nylonButton);
    expect(push).toHaveBeenCalledWith(expect.stringContaining('stock_card_modal=item-tpn'), { scroll: false });
  });

  it("shows the ledger and explains a refused issue", async () => {
    api.listStockCards.mockImplementation(() => ok([nylon]));
    api.getStockCard.mockImplementation(() =>
      ok({ item: nylon, rows: [{ transactionId: 't1', date: '2026-05-01', opening: 0, received: 6, issued: 0, closing: 6, whereRequired: 'RECIEVED' }] })
    );
    api.issueStock.mockImplementation(() =>
      refused('Cannot issue 7 pcs of Tamper Proof Nylon: only 6 pcs on hand.')
    );

    renderAt('tab=processing&sub=material-stock&stock_card_modal=item-tpn');

    const card = await screen.findByRole('dialog', { name: 'Tamper Proof Nylon' });
    expect(await within(card).findByText('RECIEVED')).toBeInTheDocument();
    expect(api.getStockCard).toHaveBeenCalledWith('item-tpn');

    await fill(/^Date/, '2026-06-01');
    await fill(/^Quantity/, '7');
    await userEvent.click(within(card).getByRole('button', { name: 'Issue' }));

    await waitFor(() =>
      expect(api.issueStock).toHaveBeenCalledWith('item-tpn', expect.objectContaining({ date: '2026-06-01', quantity: 7 }))
    );
    expect(
      await within(card).findByText('Cannot issue 7 pcs of Tamper Proof Nylon: only 6 pcs on hand.')
    ).toBeInTheDocument();
  });
});

describe('Products (API)', () => {
  it('lists the product master', async () => {
    api.listProducts.mockImplementation(() =>
      ok([{ id: 'p1', name: 'Ginger', productCode: 'SFL/002/GIG2/A10/0525/01', sku: 'GIG2', upc: '002', rawMaterialId: 'A10' }])
    );

    renderAt('tab=processing&sub=products');

    const row = (await screen.findByText('Ginger')).closest('tr') as HTMLElement;
    expect(within(row).getByText('SFL/002/GIG2/A10/0525/01')).toBeInTheDocument();
  });
});
