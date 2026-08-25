
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';

export type CongregationSettings = {
    enabled_rooms?: {
        main: boolean;
        aux2: boolean;
        aux3: boolean;
    };
    hidden_participants?: Record<string, string>; // Maps name -> ISO Date (hide until this date)
    custom_concepts?: string[];
};

export type Congregation = {
    id: number;
    name: string;
    settings?: CongregationSettings;
};

interface CongregationContextType {
    currentCongregation: Congregation | null;
    setCongregation: (cong: Congregation | null) => void;
    congregations: Congregation[];
    refreshCongregations: () => Promise<void>;
    loading: boolean;
}

const CongregationContext = createContext<CongregationContextType | undefined>(undefined);

export const CongregationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentCongregation, setCurrentCongregation] = useState<Congregation | null>(null);
    const [congregations, setCongregations] = useState<Congregation[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshCongregations = useCallback(async () => {
        setLoading(true);
        // Fetch ID, Name, and Settings
        const { data, error } = await supabase.from('congregations').select('id, name, settings').order('name');
        if (!error && data) {
            setCongregations(data);
            // Auto-select if only one exists or recover from local storage
            const storedId = localStorage.getItem('vmt_congregation_id');
            if (storedId) {
                const found = data.find(c => c.id === Number(storedId));
                if (found) setCurrentCongregation(found);
            } else if (data.length === 1) {
                setCurrentCongregation(data[0]);
            } else if (currentCongregation) {
                // Refresh current congregation data if it exists in the new list (to get updated settings)
                const found = data.find(c => c.id === currentCongregation.id);
                if (found) setCurrentCongregation(found);
            }
        }
        setLoading(false);
    }, [currentCongregation]); // Add currentCongregation as dependency if needed, or better, keep it minimal. Actually currentCongregation inside might be stale if not in deps, but for this logic it's mostly fine. Ideally we use a functional update or just refetch.

    useEffect(() => {
        refreshCongregations();
    }, []); // Run once on mount

    const setCongregation = useCallback((cong: Congregation | null) => {
        setCurrentCongregation(cong);
        if (cong) {
            localStorage.setItem('vmt_congregation_id', String(cong.id));
        } else {
            localStorage.removeItem('vmt_congregation_id');
        }
    }, []);

    const value = useMemo(() => ({
        currentCongregation,
        setCongregation,
        congregations,
        refreshCongregations,
        loading
    }), [currentCongregation, setCongregation, congregations, refreshCongregations, loading]);

    return (
        <CongregationContext.Provider value={value}>
            {children}
        </CongregationContext.Provider>
    );
};

export const useCongregation = () => {
    const context = useContext(CongregationContext);
    if (context === undefined) {
        throw new Error('useCongregation must be used within a CongregationProvider');
    }
    return context;
};
