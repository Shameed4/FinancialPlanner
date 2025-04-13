import { processIncomeEventSeries } from './Income.js'
import { processExpenseEventSeries } from './Expense.js'
import { processInvestEventSeries } from './Invest.js'
import { processRebalanceEventSeries } from './Rebalance.js'

export function processEventSeries(state, currentYear) {
  for (const series of state.eventSeries) {
    // Skip if not active this year
    if (
      currentYear < series.startYear ||
      currentYear > series.startYear + series.duration - 1
    ) {
      continue;
    }

    // Process based on event type
    switch (series.type) {
      case "income":
        processIncomeEventSeries(state, series, currentYear);
        break;
      case "expense":
        processExpenseEventSeries(state, series, currentYear);
        break;
      case "invest":
        processInvestEventSeries(state, series, currentYear);
        break;
      case "rebalance":
        processRebalanceEventSeries(state, series, currentYear);
        break;
    }
  }
}

// Helper function to check if an event series is active
export function isEventSeriesActive(series, currentYear, currentAge) {
  // First check year-based constraints
  if (series.startYear && currentYear < series.startYear) {
    return false;
  }

  if (series.endYear && currentYear > series.endYear) {
    return false;
  }

  // Check if we're within the duration of the series
  if (series.startYear && series.duration) {
    const endYear = series.startYear + series.duration - 1;
    if (currentYear > endYear) {
      return false;
    }
  }

  // Check age-based constraints
  if (series.startAge && currentAge < series.startAge) {
    return false;
  }

  if (series.endAge && currentAge > series.endAge) {
    return false;
  }

  // Check dependency on other event series
  if (series.startAfterEventSeriesId) {
    // This would require access to all event series to check if the dependent series has ended
    // For now, we assume this is handled by the calling function
  }

  // If we passed all checks, the series is active
  return true;
}

// Helper function to get the current event from a series
export function getCurrentEventFromSeries(series, currentYear, currentAge) {
  if (!isEventSeriesActive(series, currentYear, currentAge)) {
    return null;
  }

  // Base event (copy to avoid modifying the original)
  const baseEvent = { ...series };

  // Calculate years into the series
  const yearsActive = currentYear - series.startYear;

  // Apply growth to amount if applicable
  if (baseEvent.growthRate && yearsActive > 0) {
    baseEvent.amount =
      baseEvent.baseAmount * Math.pow(1 + baseEvent.growthRate, yearsActive);
  } else if (baseEvent.baseAmount) {
    baseEvent.amount = baseEvent.baseAmount;
  }

  // Handle glide path for asset allocation if applicable
  if (
    baseEvent.glidePathEnabled &&
    baseEvent.startAllocation &&
    baseEvent.endAllocation
  ) {
    // This functionality would be handled by specialized functions for each event type
    // For generic events, we'll use the calculateGlidePathAllocation function
    baseEvent.currentAllocation = calculateGlidePathAllocation(
      baseEvent,
      currentAge,
      currentYear
    );
  }

  return baseEvent;
}

// Helper function to calculate allocation based on a glide path
export function calculateGlidePathAllocation(event, currentAge, currentYear) {
  // If no glide path defined, just return the static allocation
  if (
    !event.glidePathEnabled ||
    !event.startAllocation ||
    !event.endAllocation
  ) {
    return event.allocation || {};
  }

  // Calculate position along the glide path (0 to 1)
  let progress = 0;

  if (event.glidePathType === "age") {
    // Age-based glide path
    const totalSpan = event.endAge - event.startAge;
    if (totalSpan <= 0) return event.allocation || {};

    progress = Math.min(
      1,
      Math.max(0, (currentAge - event.startAge) / totalSpan)
    );
  } else if (event.glidePathType === "year") {
    // Year-based glide path
    const totalSpan = event.endYear - event.startYear;
    if (totalSpan <= 0) return event.allocation || {};

    progress = Math.min(
      1,
      Math.max(0, (currentYear - event.startYear) / totalSpan)
    );
  }

  // Interpolate between start and end allocations
  const result = {};

  // Get all investment IDs from both start and end allocations
  const allInvestIds = new Set([
    ...Object.keys(event.startAllocation || {}),
    ...Object.keys(event.endAllocation || {}),
  ]);

  // Calculate interpolated values for each investment
  allInvestIds.forEach((investId) => {
    const startValue = (event.startAllocation || {})[investId] || 0;
    const endValue = (event.endAllocation || {})[investId] || 0;

    // Linear interpolation
    result[investId] = startValue + (endValue - startValue) * progress;
  });

  return result;
}