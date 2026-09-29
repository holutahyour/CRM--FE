import {
  PROCESSING_STATUS_OPTIONS,
  apiErrorMessage,
  fmtPercent,
  processingStatusBadge,
  yieldInputKg,
  yieldOutputKg,
  yieldPercent,
  wastePercent,
} from '../_components/processing/types';

describe('processing statuses', () => {
  it('offers the seven statuses from the workbook dropdown, in order', () => {
    expect(PROCESSING_STATUS_OPTIONS.map((o) => o.label)).toEqual([
      'Not Started',
      'In Progress',
      'Complete',
      'On Hold',
      'Overdue',
      'Needs Review',
      'Needs Update',
    ]);
    expect(PROCESSING_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      'NotStarted',
      'InProgress',
      'Complete',
      'OnHold',
      'Overdue',
      'NeedsReview',
      'NeedsUpdate',
    ]);
  });

  it('labels every status and falls back to the raw value for an unknown one', () => {
    expect(processingStatusBadge('OnHold').label).toBe('On Hold');
    expect(processingStatusBadge('Complete').className).toContain('green');
    expect(processingStatusBadge('Mystery').label).toBe('Mystery');
  });
});

// Same figures as the backend's YieldEntryResponse tests: the two must agree.
describe('yield maths', () => {
  it('is the last recorded stage over the weighed input', () => {
    expect(yieldPercent({ inputQuantity: 100, inputUnit: 'kg', dehydratedWeightKg: 10, grindWeightKg: 9 })).toBe(9);

    const hibiscus = { inputQuantity: 30, inputUnit: 'bags', inputWeightKg: 743.9, grindWeightKg: 733.75, wasteKg: 10.15 };
    expect(yieldInputKg(hibiscus)).toBe(743.9);
    expect(yieldOutputKg(hibiscus)).toBe(733.75);
    expect(wastePercent(hibiscus)).toBeCloseTo(1.3644, 4);
  });

  it('falls back through the stages that were recorded', () => {
    expect(yieldOutputKg({ dehydratedWeightKg: 15.7 })).toBe(15.7);
    expect(yieldOutputKg({ cutWeightKg: 103 })).toBe(103);
    expect(yieldOutputKg({ grindWeightKg: 18.85, secondGrindWeightKg: 18.71 })).toBe(18.71);
  });

  it('is unknown when the input was counted, not weighed, or is zero', () => {
    expect(yieldPercent({ inputQuantity: 5, inputUnit: 'bags', dehydratedWeightKg: 12 })).toBeNull();
    expect(yieldPercent({ inputQuantity: 0, inputUnit: 'kg', dehydratedWeightKg: 0 })).toBeNull();
    expect(wastePercent({ inputQuantity: 0, inputUnit: 'kg', wasteKg: 0 })).toBeNull();
  });

  it('formats a percentage to one decimal place, or a dash', () => {
    expect(fmtPercent(8.5926)).toBe('8.6%');
    expect(fmtPercent(null)).toBe('—');
  });
});

describe('apiErrorMessage', () => {
  it("uses the API's reason from a refused response or a 400", () => {
    expect(apiErrorMessage({ isSuccess: false, message: 'Customer name is required.' })).toBe(
      'Customer name is required.'
    );
    expect(
      apiErrorMessage({ response: { data: { isSuccess: false, message: 'Only 6 kg on hand.' } } })
    ).toBe('Only 6 kg on hand.');
  });

  it('falls back to a generic message when there is no reason', () => {
    expect(apiErrorMessage(new Error('Network Error'))).toBe(
      'The record could not be saved. Please try again.'
    );
  });
});
