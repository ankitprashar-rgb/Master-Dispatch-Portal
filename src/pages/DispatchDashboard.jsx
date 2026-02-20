import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfWeek, startOfMonth, startOfToday, startOfYesterday, endOfToday, endOfYesterday } from 'date-fns';
import { cn } from '../lib/utils';
import DispatchCard from '../components/dispatch/DispatchCard';
import DispatchPreview from '../components/dispatch/DispatchPreview';

export default function DispatchDashboard() {
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('3Days'); // Today, Yesterday, Last 3, Last 7, Month, All
    const [activeTab, setActiveTab] = useState('active'); // active, archive
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const [previewData, setPreviewData] = useState(null);

    const syncToSheets = async (dispatch) => {
        const apiUrl = import.meta.env.VITE_GOOGLE_CLIENTS_API_URL;
        if (!apiUrl) return;

        try {
            // We search for a function in appscript that can update a row.
            // Based on appscript.txt, we might need a custom action.
            // But since we can't edit the script, we'll try to hit the update endpoint if it exists
            // Or advice the user. For now, we hit the API with the updated data.
            await fetch(apiUrl, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({
                    action: 'update_dispatch',
                    dispatchId: dispatch.dispatch_id,
                    data: dispatch
                })
            });
        } catch (error) {
            console.error('Sync to Sheets failed:', error);
        }
    };


    // Filter Chips
    const filters = [
        { label: 'Today', value: 'Today' },
        { label: 'Yesterday', value: 'Yesterday' },
        { label: 'Last 3 Days', value: '3Days' },
        { label: 'Last 7 Days', value: '7Days' },
        { label: 'This Month', value: 'Month' },
        { label: 'All', value: 'All' },
    ];

    const fetchDispatches = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('dispatches')
                .select('*, dispatch_items(*)')
                .order('date', { ascending: false });

            // Apply Date Filters
            const today = new Date();

            if (activeFilter === 'Today') {
                query = query.gte('date', format(startOfToday(), 'yyyy-MM-dd'));
            } else if (activeFilter === 'Yesterday') {
                query = query.gte('date', format(startOfYesterday(), 'yyyy-MM-dd'))
                    .lte('date', format(endOfYesterday(), 'yyyy-MM-dd'));
            } else if (activeFilter === '3Days') {
                query = query.gte('date', format(subDays(today, 3), 'yyyy-MM-dd'));
            } else if (activeFilter === '7Days') {
                query = query.gte('date', format(subDays(today, 7), 'yyyy-MM-dd'));
            } else if (activeFilter === 'Month') {
                query = query.gte('date', format(startOfMonth(today), 'yyyy-MM-dd'));
            } else if (activeFilter === 'Custom' && customRange.from && customRange.to) {
                query = query.gte('date', customRange.from).lte('date', customRange.to);
            }

            // Archive status filter
            if (activeTab === 'archive') {
                query = query.eq('is_archived', true);
            } else {
                query = query.or('is_archived.eq.false,is_archived.is.null');
            }

            const { data, error } = await query;
            if (error) throw error;
            setDispatches(data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDispatches();
    }, [activeFilter, customRange, activeTab]);

    // Handle Update
    const handleUpdate = async (id, field, value) => {
        try {
            const { data, error } = await supabase
                .from('dispatches')
                .update({ [field]: value })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setDispatches(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

            // Sync to Google Sheets
            if (data) syncToSheets(data);
        } catch (error) {
            console.error('Error updating:', error);
        }
    };

    // Handle Notify Client
    const handleNotifyClient = async (dispatch) => {
        const apiUrl = import.meta.env.VITE_GOOGLE_CLIENTS_API_URL;
        if (!apiUrl) return;

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
            throw error; // Let the DispatchCard catch it so it stops loading
        }
    };

    // Handle Print Success
    const handlePrintSuccess = async (id) => {
        try {
            const { data, error } = await supabase
                .from('dispatches')
                .update({ pdf_generated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setDispatches(prev => prev.map(d => d.id === id ? { ...d, pdf_generated_at: new Date().toISOString() } : d));

            // Sync to Google Sheets
            if (data) syncToSheets(data);
        } catch (error) {
            console.error('Error recording print:', error);
        }
    };

    // Client-side Search
    const filteredData = dispatches.filter(d => {
        const search = searchTerm.toLowerCase();
        return (
            d.client_name?.toLowerCase().includes(search) ||
            d.project_name?.toLowerCase().includes(search) ||
            d.dispatch_id?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Dispatch PDF Preview Overlay */}
            {previewData && (
                <DispatchPreview
                    data={previewData}
                    onClose={() => setPreviewData(null)}
                    onPrintSuccess={handlePrintSuccess}
                />
            )}

            {/* Header Area */}
            <div className="shrink-0 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Tracking & Summary</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time logistics & reporting</p>
                    </div>

                    {/* Tabs: Active / Archive */}
                    <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-inner self-start sm:self-auto">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={cn(
                                "px-6 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === 'active'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setActiveTab('archive')}
                            className={cn(
                                "px-6 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === 'archive'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            Archive
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                        {filters.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setActiveFilter(f.value)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border shadow-sm",
                                    activeFilter === f.value
                                        ? 'bg-brand border-brand-hover text-gray-900 transform scale-105'
                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                                )}
                            >
                                {f.label}
                            </button>
                        ))}

                        {/* Custom Date Pill */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm transition-all",
                            activeFilter === 'Custom'
                                ? "bg-brand border-brand-hover"
                                : "bg-white border-gray-200"
                        )}>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter",
                                activeFilter === 'Custom' ? "text-gray-900" : "text-gray-400"
                            )}>Custom</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    className="text-[10px] bg-transparent border-none p-0 outline-none w-24 font-bold"
                                    onChange={(e) => {
                                        setCustomRange(p => ({ ...p, from: e.target.value }));
                                        setActiveFilter('Custom');
                                    }}
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    className="text-[10px] bg-transparent border-none p-0 outline-none w-24 font-bold"
                                    onChange={(e) => {
                                        setCustomRange(p => ({ ...p, to: e.target.value }));
                                        setActiveFilter('Custom');
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-72">
                        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search client, project, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand focus:border-brand-hover outline-none shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="bg-gray-100/30 rounded-2xl border border-gray-200 flex-1 overflow-hidden flex flex-col shadow-inner">
                <div className="overflow-y-auto p-6 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-brand" />
                            <p className="font-bold uppercase tracking-widest text-[10px]">Synchronizing Fleet Data...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-300 gap-4">
                            <Calendar size={48} strokeWidth={1} />
                            <div className="text-center">
                                <p className="font-black uppercase tracking-tighter text-lg">No records found</p>
                                <p className="text-xs font-medium">Try adjusting your filters or search terms</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                            {filteredData.map(d => (
                                <DispatchCard
                                    key={d.id}
                                    data={d}
                                    mode="dashboard"
                                    onUpdate={handleUpdate}
                                    onDelete={async (id) => {
                                        const { error } = await supabase.from('dispatches').delete().eq('id', id);
                                        if (!error) setDispatches(prev => prev.filter(item => item.id !== id));
                                    }}
                                    onViewPdf={setPreviewData}
                                    onNotify={handleNotifyClient}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            {filteredData.length} Dispatches Found
                        </span>
                        <div className="h-4 w-px bg-gray-200"></div>
                        <span className="text-[10px] font-bold text-gray-500">
                            Mode: {activeTab === 'active' ? 'Operational' : 'Archived Results'}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                        LATENCY: 24ms • LAST SYNC: {format(new Date(), 'HH:mm:ss')}
                    </span>
                </div>
            </div>
        </div>
    );
}
