/**
 * Canonical activity type map shared by the Express server and the React client.
 * The numeric index values must match Monday.com's status column configuration.
 *
 * To add a new type: append it here AND update the Monday.com board column.
 */
export const ACTIVITY_TYPES = {
    vacation: 0,
    billable: 1,
    holding: 2,
    education: 3,
    work_reduction: 4,
    tbd: 5,
    holiday: 6,
    presales: 7,
    illness: 8,
    paid_not_worked: 9,
    intellectual_capital: 10,
    business_development: 11,
    overhead: 12,
    l104: 13,
};

/**
 * Returns the activity name string for a given numeric index.
 * Falls back to 'billable' for unknown values.
 */
export function getActivityName(value) {
    for (const [key, val] of Object.entries(ACTIVITY_TYPES)) {
        if (val === value) return key;
    }
    return 'billable';
}
