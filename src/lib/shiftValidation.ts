import { Shift } from "../types";

/**
 * Checks if a given employee has any existing shift on the specified date.
 * Returns the conflicting Shift if found, otherwise null.
 */
export function findOverlappingShift(
  shifts: Shift[],
  employeeId: string,
  date: string
): Shift | null {
  if (!employeeId || !date) return null;
  
  // Find a shift assigned to the same employee on the same calendar day
  const overlap = shifts.find(
    (s) => s.employeeId === employeeId && s.date === date
  );
  
  return overlap || null;
}
