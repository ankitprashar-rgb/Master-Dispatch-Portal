import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Mail, ExternalLink, Paperclip, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import DispatchCard from '../components/dispatch/DispatchCard';

export default function TrackingSheet() {
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    // Fetch Data
    const fetchDispatches = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('dispatches')
                .select('*')
                .order('date', { ascending: false });

            if (dateRange.from) query = query.gte('date', dateRange.from);
            if (dateRange.to) query = query.lte('date', dateRange.to);

            const { data, error } = await query;

            if (error) throw error;
            setDispatches(data || []);
        } catch (error) {
            console.error('Error fetching dispatches:', error);
            // alert('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Initial Load
    useEffect(() => {
        // Default to last 30 days if needed, or just load all recent
        fetchDispatches();
    }, []);

    // Handle Input Changes (for simple updates, complex updates need separate component/modal)
    const handleUpdate = async (id, field, value) => {
        try {
            const { error } = await supabase
                .from('dispatches')
                .update({ [field]: value })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setDispatches(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
        } catch (error) {
            console.error('Error updating:', error);
            alert('Update failed');
        }
    };

    // Handle Notify Client
    const handleNotifyClient = async (dispatch) => {
        const apiUrl = import.meta.env.VITE_GOOGLE_CLIENTS_API_URL;
        if (!apiUrl) {
            alert('Email API URL not configured.');
            return;
        }

        try {
            // Optimistic DB update
            const { error: dbError } = await supabase
                .from('dispatches')
                .update({ email_sent_at: new Date().toISOString() })
                .eq('id', dispatch.id);

            if (dbError) throw dbError;

            // Trigger Google Apps Script to send email
            await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'notify',
                    dispatchId: dispatch.dispatch_id,
                    data: dispatch
                })
            });

            setDispatches(prev => prev.map(d => d.id === dispatch.id ? { ...d, email_sent_at: new Date().toISOString() } : d));
        } catch (error) {
            console.error('Error notifying client:', error);
            throw error;
        }
    };

    const [showAll, setShowAll] = useState(false);

    // Filter Logic
    const filteredData = dispatches.filter(d => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            d.client_name?.toLowerCase().includes(search) ||
            d.project_name?.toLowerCase().includes(search) ||
            d.dispatch_id?.toLowerCase().includes(search)
        );

        // Show all if toggled, otherwise only show pending (no email sent)
        const matchesStatus = showAll ? true : !d.email_sent_at;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">Tracking Sheet</h1>
                    <p className="text-xs text-gray-500">Update courier details & notify clients</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="bg-brand px-4 py-2 flex items-center justify-between shrink-0">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Tracking Updates</h2>
                    <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-300">
                        {filteredData.length} Records
                    </span>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-end shrink-0 bg-white">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-600 block">Search</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Client, Project, ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="text-xs pl-8 p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none w-48"
                            />
                        </div>
                    </div>
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

                    <div className="flex items-center gap-2 pb-2 ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={showAll}
                                onChange={() => setShowAll(!showAll)}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                            <span className="ml-2 text-xs font-medium text-gray-700">Show Completed</span>
                        </label>
                    </div>

                    <button
                        onClick={fetchDispatches}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand text-gray-900 text-xs font-bold hover:bg-brand-hover shadow-sm ml-auto"
                    >
                        <Filter size={14} /> Apply Filter
                    </button>
                </div>

                {/* Card List View */}
                <div className="overflow-auto flex-1 p-4 bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-gray-500 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Loading Data...
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-gray-400">
                            No dispatches found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                            {filteredData.map((d) => (
                                <DispatchCard
                                    key={d.id}
                                    data={d}
                                    mode="tracking"
                                    onUpdate={handleUpdate}
                                    onNotify={handleNotifyClient}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
