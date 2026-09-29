import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OperationsPage from '../page';

const push = jest.fn();
let currentParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/operations',
  useSearchParams: () => currentParams,
}));

jest.mock('@/data/api/ApiHandler', () => ({
  __esModule: true,
  default: { operations: {} },
}));

function renderAt(search: string) {
  currentParams = new URLSearchParams(search);
  return render(<OperationsPage />);
}

beforeEach(() => {
  push.mockClear();
});

describe('OperationsPage', () => {
  it('shows the three operations sections with Facility Management selected by default', () => {
    renderAt('');

    expect(screen.getByRole('heading', { name: 'Operations' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Facility Management' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Processing' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByRole('tab', { name: 'Logistics' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('renders the facility counters, cohorts and allocations', () => {
    renderAt('');

    expect(screen.getByText('Total Greenhouses')).toBeInTheDocument();
    expect(screen.getByText('33')).toBeInTheDocument();
    expect(screen.getByText('Shortlet Accommodation')).toBeInTheDocument();

    expect(screen.getByText('Cohort 12')).toBeInTheDocument();

    // Staff Block A: 15 units, 12 allocated -> 3 unallocated
    const blockA = screen.getByLabelText('Edit Staff Block A').closest('div') as HTMLElement;
    expect(within(blockA).getByText('Staff Block A')).toBeInTheDocument();
    expect(within(blockA).getByText('Total: 15 units')).toBeInTheDocument();
    expect(within(blockA).getByText('Allocated: 12')).toBeInTheDocument();
    expect(within(blockA).getByText('Unallocated: 3')).toBeInTheDocument();

    // Admin Building: 20 offices, 15 allocated -> 5 unallocated
    const adminBuilding = screen
      .getByLabelText('Edit Admin Building')
      .closest('div') as HTMLElement;
    expect(within(adminBuilding).getByText('Total: 20 offices')).toBeInTheDocument();
    expect(within(adminBuilding).getByText('Unallocated: 5')).toBeInTheDocument();
  });

  it('drops the sub-tab when a different section is selected', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('tab=processing&sub=machine-usage-logs');

    await user.click(screen.getByRole('tab', { name: 'Logistics' }));

    expect(push).toHaveBeenCalledWith('/operations?tab=logistics', { scroll: false });
  });

  it('offers a Processing sub-tab for every part of the batch production workbook', () => {
    renderAt('tab=processing');

    expect(
      screen.getAllByRole('tab').slice(3).map((t) => t.textContent)
    ).toEqual([
      'Batch Scheduling',
      'Order Requests',
      'Yield Log',
      'Material Stock',
      'Products',
      'Machine Usage Logs',
    ]);
    expect(screen.getByRole('tab', { name: 'Batch Scheduling' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the empty batch scheduling table on the Processing tab', () => {
    renderAt('tab=processing');

    expect(screen.getByRole('heading', { name: 'Batch Scheduling' })).toBeInTheDocument();
    expect(screen.getByText('No batches scheduled yet.')).toBeInTheDocument();

    const header = screen.getByRole('table');
    expect(within(header).getByText('Batch ID')).toBeInTheDocument();
    expect(within(header).getByText('Work Center(s)')).toBeInTheDocument();
  });

  it.each([
    ['order-requests', 'Order Requests', 'No order requests yet.'],
    ['yield-log', 'Yield Log', 'No yield entries yet.'],
    ['products', 'Products', 'No products yet.'],
    ['machine-usage-logs', 'Machine Usage Logs', 'No machine usage logs yet.'],
  ])('shows the empty %s section', (sub, heading, empty) => {
    renderAt(`tab=processing&sub=${sub}`);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByText(empty)).toBeInTheDocument();
  });

  it('shows the three stock-card categories on Material Stock', () => {
    renderAt('tab=processing&sub=material-stock');

    expect(screen.getByRole('heading', { name: 'Processing – Raw Produce' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Processing – Ingredients' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Processing – Packaging & Supplies' })).toBeInTheDocument();
  });

  it('shows the empty vehicle tracking table on the Logistics tab', () => {
    renderAt('tab=logistics');

    expect(screen.getByRole('heading', { name: 'Vehicle Tracking Logs' })).toBeInTheDocument();
    expect(screen.getByText('No tracking logs yet.')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Distance (km)')).toBeInTheDocument();
  });

  it('opens the Add Vehicle Tracking Log modal from the URL', () => {
    renderAt('tab=logistics&vehicle_tracking_modal=true');

    const dialog = screen.getByRole('dialog', { name: 'Add Vehicle Tracking Log' });
    expect(within(dialog).getByText('Enter trip details')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('Vehicle name / plate no.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add Log' })).toBeInTheDocument();
  });

  it('opens the Add Batch modal from the URL', () => {
    renderAt('tab=processing&batch_modal=true');

    const dialog = screen.getByRole('dialog', { name: 'Add Batch' });
    expect(within(dialog).getByPlaceholderText('e.g. HI925001')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Status/)).toHaveValue('NotStarted');
    expect(within(dialog).getByRole('button', { name: 'Save Batch' })).toBeInTheDocument();
  });
});
