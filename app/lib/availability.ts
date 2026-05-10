/**
 * Time-based availability logic for menu items
 *
 * NOTE: Square Sandbox does not persist category.availabilityPeriods,
 * so we implement a client-side demonstration of the concept.
 * In production with a real Square account, this would read from
 * category.categoryData.availabilityPeriods directly.
 */

// Hardcoded availability schedule (demonstration)
// In production, this would come from category.categoryData.availabilityPeriods
const CATEGORY_SCHEDULES: Record<string, {
  startTime: string;  // HH:MM format
  endTime: string;
  daysOfWeek?: string[]; // MON-SUN, undefined = all days
}> = {
  'Breakfast': {
    startTime: '06:00',
    endTime: '11:00',
  },
  'Lunch': {
    startTime: '11:00',
    endTime: '16:00',
  },
  'Beverages': {
    startTime: '00:00',
    endTime: '23:59', // All day
  },
  'Desserts': {
    startTime: '14:00',
    endTime: '23:59',
  },
};

/**
 * Check if a category is currently available based on time
 * Uses browser's local time for intuitive demo experience
 * @param categoryName Name of the category
 * @returns true if available now, false otherwise
 */
export function isCategoryAvailableNow(
  categoryName: string
): boolean {
  const schedule = CATEGORY_SCHEDULES[categoryName];
  if (!schedule) {
    return true; // No restrictions = always available
  }

  // Use browser's local time for better demo UX
  // In production, you'd use location's timezone for accuracy
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentTime = timeString;
  const { startTime, endTime } = schedule;

  // Simple time comparison (HH:MM format)
  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Get availability status with human-readable message
 */
export function getCategoryAvailability(
  categoryName: string
): {
  available: boolean;
  message: string;
  nextAvailable?: string;
} {
  const schedule = CATEGORY_SCHEDULES[categoryName];

  if (!schedule) {
    return {
      available: true,
      message: 'Available all day',
    };
  }

  const isAvailable = isCategoryAvailableNow(categoryName);

  if (isAvailable) {
    return {
      available: true,
      message: `Available until ${formatTime(schedule.endTime)}`,
    };
  }

  return {
    available: false,
    message: `Available ${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`,
    nextAvailable: schedule.startTime,
  };
}

/**
 * Format time from HH:MM to human-readable (e.g., "11:00" → "11:00 AM")
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get all availability periods for documentation/display
 */
export function getCategorySchedule(categoryName: string) {
  return CATEGORY_SCHEDULES[categoryName];
}

/**
 * Get current time being used for availability checks (for display/debugging)
 */
export function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  });
}
