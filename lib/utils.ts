

type DateFormat = 'long' | 'short';

/**
 * Formats a week ID string (e.g., "2023-10-27") into a localized date string (Thursday for 2026, Friday otherwise).
 * @param weekId The week ID in "YYYY-MM-DD" format. The date can be any day of that week.
 * @param format The desired date format: 'long' (e.g., "27 de octubre de 2023") or 'short' (e.g., "27/10/2023").
 * @returns A formatted date string or the original weekId if parsing fails.
 */
export function getFridayFromWeekId(weekId: string, format: DateFormat = 'long'): string {
    try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) return weekId;
        
        // Use UTC to avoid timezone issues with date manipulation
        const date = new Date(weekId + 'T12:00:00Z');
        if (isNaN(date.getTime())) return weekId;

        // Determine meeting day: Thursday (4) for 2026, Friday (5) otherwise
        const year = date.getUTCFullYear();
        const targetDay = year === 2026 ? 4 : 5;

        const dayOfWeek = date.getUTCDay(); 
        const daysUntilTarget = (targetDay - dayOfWeek + 7) % 7;
        
        date.setUTCDate(date.getUTCDate() + daysUntilTarget);

        const options: Intl.DateTimeFormatOptions = format === 'long' 
            ? { day: "numeric", month: "long", year: "numeric", timeZone: 'UTC' }
            : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };

        return new Intl.DateTimeFormat("es-ES", options).format(date);
    } catch (e) {
        console.error(`Error formatting date for weekId: ${weekId}`, e);
        return weekId;
    }
}

/**
 * Formats a week ID string (e.g., "2023-10-27") into a short date string for the meeting day (Thursday for 2026, Friday otherwise).
 * @param weekId The week ID in "YYYY-MM-DD" format.
 * @returns A formatted date string (e.g., "27 oct.") or the original weekId if parsing fails.
 */
export function getShortDate(weekId: string): string {
    try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) return weekId;
        
        const date = new Date(weekId + 'T12:00:00Z');
        if (isNaN(date.getTime())) return weekId;

        // Determine meeting day: Thursday (4) for 2026, Friday (5) otherwise
        const year = date.getUTCFullYear();
        const targetDay = year === 2026 ? 4 : 5;

        const dayOfWeek = date.getUTCDay();
        const daysUntilTarget = (targetDay - dayOfWeek + 7) % 7;
        date.setUTCDate(date.getUTCDate() + daysUntilTarget);

        return new Intl.DateTimeFormat("es-ES", { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date);
    } catch (e) {
        console.error(`Error getting short date for weekId: ${weekId}`, e);
        return weekId;
    }
}

/**
 * Calculates the start of the week (Monday) for a given date.
 * @param date The input date.
 * @returns A new Date object set to the beginning of that Monday.
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - 0, Monday - 1, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Formats an ISO date string into a relative time string.
 * @param isoString The ISO date string from the database.
 * @returns A human-readable relative time string (e.g., "hace 5 minutos").
 */
export const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `hace segundos`;
    if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `hace ${days} día${days > 1 ? 's' : ''}`;
    
    return `el ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
};

export const isEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
        return false;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
        if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) {
            return false;
        }
    }
    
    return true;
};

