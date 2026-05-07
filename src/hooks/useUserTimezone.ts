import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import { getBrowserTimezone } from "../lib/timezone";

const timezoneListeners = new Set<(tz: string) => void>();

export function notifyTimezoneChange(newTimezone: string) {
  timezoneListeners.forEach(listener => listener(newTimezone));
}

/**
 * Hook to get the current user's timezone setting.
 * Falls back to browser timezone if not set or if loading fails.
 * Automatically updates when timezone is changed via settings.
 */
export function useUserTimezone() {
  const [timezone, setTimezone] = useState<string>(getBrowserTimezone());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    userService.getCurrentUser()
      .then(user => {
        if (!mounted) return;
        if (user?.timezone) setTimezone(user.timezone);
      })
      .catch(err => {
        // Falls back to the browser timezone already in state.
        console.error('Failed to load user timezone:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const listener = (newTimezone: string) => setTimezone(newTimezone);
    timezoneListeners.add(listener);

    return () => {
      mounted = false;
      timezoneListeners.delete(listener);
    };
  }, []);

  return { timezone, loading };
}
