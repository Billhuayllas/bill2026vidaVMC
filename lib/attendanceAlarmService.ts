// Service to manage Attendance Alarms, Reminders, and Week computations

export interface AttendanceAlarmConfig {
    enabled: boolean;
    midweek_day: number; // 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
    midweek_time: string; // "21:00"
    weekend_day: number; // 0 = Domingo
    weekend_time: string; // "20:30"
    sound_enabled: boolean;
}

export const DEFAULT_ALARM_CONFIG: AttendanceAlarmConfig = {
    enabled: true,
    midweek_day: 5, // Viernes
    midweek_time: "21:00", // 9:00 PM
    weekend_day: 0, // Domingo
    weekend_time: "20:30", // 8:30 PM
    sound_enabled: true
};

export interface WeekInfo {
    key: 'week1' | 'week2' | 'week3' | 'week4' | 'week5';
    index: number; // 1 to 5
    label: string;
    startDay: number;
    endDay: number;
    dateRangeStr: string;
    isCurrent: boolean;
    isPast: boolean;
    isFuture: boolean;
    isMidweekPending: boolean;
    isWeekendPending: boolean;
    isComplete: boolean;
}

export const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
];

/**
 * Calculates month weeks boundaries and statuses
 */
export function getMonthWeeksInfo(
    yearMonthStr: string, // e.g. "2026-08"
    weeksData: {
        week1: { midweek: string; weekend: string; };
        week2: { midweek: string; weekend: string; };
        week3: { midweek: string; weekend: string; };
        week4: { midweek: string; weekend: string; };
        week5: { midweek: string; weekend: string; };
    }
): WeekInfo[] {
    const [year, month] = yearMonthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const isThisMonth = currentYear === year && currentMonth === month;
    
    const monthShortNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const mName = monthShortNames[month - 1] || '';

    const weekRanges = [
        { start: 1, end: Math.min(7, daysInMonth) },
        { start: 8, end: Math.min(14, daysInMonth) },
        { start: 15, end: Math.min(21, daysInMonth) },
        { start: 22, end: Math.min(28, daysInMonth) },
        { start: 29, end: daysInMonth }
    ];

    const weekKeys: ('week1' | 'week2' | 'week3' | 'week4' | 'week5')[] = ['week1', 'week2', 'week3', 'week4', 'week5'];

    return weekKeys.map((key, idx) => {
        const range = weekRanges[idx];
        const hasDays = range.start <= daysInMonth;
        const startDay = range.start;
        const endDay = range.end;

        const isCurrent = isThisMonth && currentDay >= startDay && currentDay <= endDay;
        const isPast = isThisMonth ? currentDay > endDay : (year < currentYear || (year === currentYear && month < currentMonth));
        const isFuture = isThisMonth ? currentDay < startDay : (year > currentYear || (year === currentYear && month > currentMonth));

        const midVal = weeksData[key]?.midweek?.trim() || '';
        const weekVal = weeksData[key]?.weekend?.trim() || '';

        const isComplete = hasDays && midVal !== '' && weekVal !== '';
        const isMidweekPending = hasDays && (isPast || isCurrent) && midVal === '';
        const isWeekendPending = hasDays && (isPast || isCurrent) && weekVal === '';

        const dateRangeStr = hasDays 
            ? `${String(startDay).padStart(2, '0')} - ${String(endDay).padStart(2, '0')} ${mName}`
            : 'Sin días';

        return {
            key,
            index: idx + 1,
            label: `Semana 0${idx + 1}`,
            startDay,
            endDay,
            dateRangeStr,
            isCurrent,
            isPast,
            isFuture,
            isMidweekPending,
            isWeekendPending,
            isComplete
        };
    });
}

/**
 * Check if the attendance alarm should trigger right now
 */
export function checkAttendanceAlarmStatus(
    config: AttendanceAlarmConfig,
    attendanceSettings: Record<string, any>
): {
    hasAlarm: boolean;
    message: string;
    targetMeeting: 'midweek' | 'weekend' | 'both';
    weekIndex: number;
    yearMonthStr: string;
} {
    if (!config.enabled) {
        return { hasAlarm: false, message: '', targetMeeting: 'midweek', weekIndex: 1, yearMonthStr: '' };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentDayOfWeek = now.getDay(); // 0-6
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const currentYearMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthData = attendanceSettings?.[currentYearMonthStr] || {
        week1: { midweek: '', weekend: '' },
        week2: { midweek: '', weekend: '' },
        week3: { midweek: '', weekend: '' },
        week4: { midweek: '', weekend: '' },
        week5: { midweek: '', weekend: '' },
    };

    const weeksInfo = getMonthWeeksInfo(currentYearMonthStr, monthData);
    const currentWeek = weeksInfo.find(w => w.isCurrent) || weeksInfo[0];

    const midRecorded = monthData[currentWeek.key]?.midweek?.trim() !== '';
    const weekendRecorded = monthData[currentWeek.key]?.weekend?.trim() !== '';

    // Check Midweek Alarm condition:
    // Today is the configured midweek day (or after) and past the configured time, and midweek attendance is NOT recorded yet
    const isMidweekAlarmTime = 
        (currentDayOfWeek > config.midweek_day) ||
        (currentDayOfWeek === config.midweek_day && currentTimeStr >= config.midweek_time);

    // Check Weekend Alarm condition:
    // Today is the configured weekend day (or after) and past the configured time, and weekend attendance is NOT recorded yet
    const isWeekendAlarmTime = 
        (config.weekend_day === 0 && currentDayOfWeek === 0 && currentTimeStr >= config.weekend_time) ||
        (config.weekend_day !== 0 && currentDayOfWeek >= config.weekend_day && currentTimeStr >= config.weekend_time);

    if (!midRecorded && isMidweekAlarmTime) {
        return {
            hasAlarm: true,
            message: `⚠️ Recordatorio: Falta registrar la asistencia de Entre Semana (${currentWeek.label} - ${currentWeek.dateRangeStr})`,
            targetMeeting: 'midweek',
            weekIndex: currentWeek.index,
            yearMonthStr: currentYearMonthStr
        };
    }

    if (!weekendRecorded && isWeekendAlarmTime) {
        return {
            hasAlarm: true,
            message: `⚠️ Recordatorio: Falta registrar la asistencia de Fin de Semana (${currentWeek.label} - ${currentWeek.dateRangeStr})`,
            targetMeeting: 'weekend',
            weekIndex: currentWeek.index,
            yearMonthStr: currentYearMonthStr
        };
    }

    // Check if any past week of this month is missing records completely
    const pastPending = weeksInfo.find(w => w.isPast && (!monthData[w.key]?.midweek?.trim() || !monthData[w.key]?.weekend?.trim()));
    if (pastPending) {
        return {
            hasAlarm: true,
            message: `⚠️ Atención: Hay registros de asistencia pendientes en ${pastPending.label} (${pastPending.dateRangeStr})`,
            targetMeeting: 'both',
            weekIndex: pastPending.index,
            yearMonthStr: currentYearMonthStr
        };
    }

    return { hasAlarm: false, message: '', targetMeeting: 'midweek', weekIndex: currentWeek.index, yearMonthStr: currentYearMonthStr };
}

/**
 * Play a friendly, crisp notification chime using Web Audio API
 */
export function playAttendanceAlarmSound(): void {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // First Bell Note (C5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Second Higher Bell Note (G5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, now + 0.18); // G5
        gain2.gain.setValueAtTime(0, now + 0.18);
        gain2.gain.linearRampToValueAtTime(0.35, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.9);

    } catch (e) {
        console.warn('AudioContext not allowed or supported', e);
    }
}

/**
 * Request Notification permission on Android, iOS, Desktop
 */
export async function requestAppNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        return false;
    }
    if (Notification.permission === 'granted') {
        return true;
    }
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}

/**
 * Show native notification if allowed
 */
export function triggerSystemNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
            });
        } catch (e) {
            console.warn('Error showing system notification', e);
        }
    }
}
