import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import { getBrowserTimezone } from "../lib/timezone";

// Simple event emitter for timezone updates
const timezoneListeners = new Set<(tz: string) => void>();

export function notifyTimezoneChange(newTimezone: string) {
  timezoneListeners.forEach(listener => listener(newTimezone));
}

/**
 * Hook to get the current user's timezone setting.
 * Falls back to browser timezone if not set.
 * Automatically updates when timezone is changed via settings.
 */
export function useUserTimezone() {
  const [timezone, setTimezone] = useState<string>(getBrowserTimezone());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await userService.getCurrentUser();
        if (user?.timezone) {
          setTimezone(user.timezone);
        }
      } catch {
        // Keep browser timezone as fallback
      } finally {
        setLoading(false);
      }
    };
    load();

    // Listen for timezone updates
    const listener = (newTimezone: string) => {
      setTimezone(newTimezone);
    };
    timezoneListeners.add(listener);

    return () => {
      timezoneListeners.delete(listener);
    };
  }, []);

  return { timezone, loading };
}
