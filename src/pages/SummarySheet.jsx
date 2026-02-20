import React, { useState, useEffect } from 'react';
import { Filter, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import DispatchCard from '../components/dispatch/DispatchCard';

export default function SummarySheet() {
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    const fetchDispatches = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('dispatches')
                .select('*, dispatch_items(*)')
                .order('date', { ascending: false });

            if (dateRange.from) query = query.gte('date', dateRange.from);
            if (dateRange.to) query = query.lte('date', dateRange.to);

            const { data, error } = await query;
            if (error) throw error;
            setDispatches(data || []);
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchDispatches();
    }, []);

    const filteredData = dispatches.filter(d => {
        const search = searchTerm.toLowerCase();
        return (
            d.client_name?.toLowerCase().includes(search) ||
            d.project_name?.toLowerCase().includes(search) ||
            d.dispatch_id?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">Summary Sheet</h1>
                    <p className="text-xs text-gray-500">View & export dispatch reports</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="bg-brand px-4 py-2 flex items-center justify-between shrink-0">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Search & Filter</h2>
                    <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-300">
                        {filteredData.length} Records
                    </span>
                </div>

                <div className="p-4 flex flex-wrap gap-4 items-end bg-white border-b border-gray-100 shrink-0">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-600 block">From Date</label>
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-600 block">To Date</label>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-600 block">Search</label>
                        <input
                            type="text"
                            placeholder="Client, Project..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none w-48"
                        />
                    </div>
                    <button
                        onClick={fetchDispatches}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand text-gray-900 text-xs font-bold hover:bg-brand-hover shadow-sm"
                    >
                        <Filter size={14} /> Run Search
                    </button>
                </div>

                {/* Grid List View */}
                <div className="overflow-auto flex-1 p-4 bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-gray-500 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Loading Data...
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-gray-400">
                            No records found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                            {filteredData.map((d) => (
                                <DispatchCard
                                    key={d.id}
                                    data={d}
                                    mode="summary"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
