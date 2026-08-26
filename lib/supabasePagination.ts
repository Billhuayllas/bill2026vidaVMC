import { supabase } from './supabase';

/**
 * Executes a paginated fetch loop across Supabase PostgREST endpoints.
 * Bypasses the default 1000-row limit truncation.
 */
export async function fetchAllRows<T = any>(
    queryFactory: (rangeStart: number, rangeEnd: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
    const pageSize = 1000;
    let allRows: T[] = [];
    let page = 0;

    while (true) {
        const start = page * pageSize;
        const end = start + pageSize - 1;
        const { data, error } = await queryFactory(start, end);

        if (error) {
            console.error("Error fetching paginated rows from Supabase:", error);
            throw error;
        }

        if (!data || data.length === 0) {
            break;
        }

        allRows = allRows.concat(data);

        if (data.length < pageSize) {
            break;
        }

        page++;
    }

    return allRows;
}

/**
 * Fetches all ministry reports for a congregation within an optional service year / month range.
 */
export async function fetchAllMinistryReports(
    congregationId: number | string,
    startMonth?: string,
    endMonth?: string
): Promise<any[]> {
    return fetchAllRows(async (start, end) => {
        let q = supabase
            .from('informes_ministerio')
            .select('*')
            .eq('congregation_id', congregationId);

        if (startMonth) q = q.gte('mes', startMonth);
        if (endMonth) q = q.lte('mes', endMonth);

        return await q.order('mes', { ascending: true }).range(start, end);
    });
}
