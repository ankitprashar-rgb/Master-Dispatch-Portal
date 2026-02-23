import React, { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Trash2, Printer, Search, Loader2, FileDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import DispatchPreview from '../components/dispatch/DispatchPreview';

export default function DispatchForm() {
    const [items, setItems] = useState([{ id: Date.now(), desc: '', qty: '', amount: '', masterQty: 0, dispatchedSoFar: 0 }]);
    const [shipToMode, setShipToMode] = useState('client');

    // Data State
    const [clients, setClients] = useState([]);
    const [installers, setInstallers] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState({}); // { itemDesc: { dispatched: X, master: Y } }
    const [isOcrRunning, setIsOcrRunning] = useState(false);
    const [ocrStatus, setOcrStatus] = useState('');
    const fileInputRef = useRef(null);
    const [showPreview, setShowPreview] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        clientName: '',
        projectName: '',
        shipToAddress: '',
        shipToPoc: '',
        shipToPhone: '',
        shipToEmail: ''
    });

    // Fetch Clients & Installers on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const url = import.meta.env.VITE_GOOGLE_CLIENTS_API_URL;
                if (!url) return;

                const res = await fetch(url);
                const data = await res.json();
                if (data.clients) setClients(data.clients);
                if (data.installers) setInstallers(data.installers);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const handleClientChange = (e) => {
        const val = e.target.value;
        const found = clients.find(c => String(c.name).trim().toLowerCase() === String(val).trim().toLowerCase());

        setFormData(prev => ({
            ...prev,
            clientName: val,
            projectName: '', // Reset project
            shipToAddress: shipToMode === 'client' ? (found?.address || '') : prev.shipToAddress,
            shipToPoc: shipToMode === 'client' ? (found?.poc || '') : prev.shipToPoc,
            shipToPhone: shipToMode === 'client' ? (found?.phone || '') : prev.shipToPhone,
            shipToEmail: shipToMode === 'client' ? (found?.email || '') : prev.shipToEmail
        }));
        setSelectedClient(found || null);
        setStats({});
        setItems([{ id: Date.now(), desc: '', qty: '', amount: '', masterQty: 0, dispatchedSoFar: 0 }]);
    };

    const handleInstallerChange = (e) => {
        const val = e.target.value;
        const found = installers.find(i => i.name === val);
        if (found) {
            setFormData(prev => ({
                ...prev,
                shipToAddress: found.address || '',
                shipToPoc: found.poc || '',
                shipToPhone: found.phone || '',
                shipToEmail: found.email || ''
            }));
        }
    };

    const handleProjectChange = async (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, projectName: val }));

        if (selectedClient && val) {
            const projectData = selectedClient.projects.find(p => p.name === val);

            // FETCH ALL HISTORICAL DISPATCHES FOR THIS PROJECT (Fuzzy Query)
            try {
                const { data: dispatchesData, error } = await supabase
                    .from('dispatches')
                    .select('*, dispatch_items(*)')
                    .ilike('client_name', `%${selectedClient.name.trim()}%`)
                    .ilike('project_name', `%${val.trim()}%`);

                if (error) throw error;

                // AGGREGATE FROM BOTH SOURCES
                const historyRaw = [];
                (dispatchesData || []).forEach(d => {
                    if (d.dispatch_items && d.dispatch_items.length > 0) {
                        d.dispatch_items.forEach(item => {
                            historyRaw.push({ desc: String(item.description || '').trim(), qty: Number(item.quantity) || 0 });
                        });
                    } else if (d.dispatch_data?.items && d.dispatch_data.items.length > 0) {
                        d.dispatch_data.items.forEach(item => {
                            historyRaw.push({ desc: String(item.desc || '').trim(), qty: Number(item.qty) || 0 });
                        });
                    }
                });

                // Helper for Aggressive Fuzzy Normalization
                const normalize = (s) => {
                    return String(s || '').toLowerCase()
                        .replace(/\bmaruti\b/gi, '')
                        .replace(/\btata\b/gi, '')
                        .replace(/\bsets\b/gi, '')
                        .replace(/wagnor/gi, 'wagonr')
                        .replace(/wagon-r/gi, 'wagonr')
                        .replace(/\s+/g, '') // Remove all whitespace
                        .trim();
                };

                const newStats = {};
                if (projectData && projectData.items) {
                    const newItems = projectData.items.map((item, index) => {
                        const masterClean = normalize(item.desc);

                        // Sum all historical items that "fuzzy-match" this master item
                        let dispatched = 0;
                        historyRaw.forEach(hist => {
                            const histClean = normalize(hist.desc);
                            // Match if keywords overlap after cleaning
                            if (histClean === masterClean || histClean.includes(masterClean) || masterClean.includes(histClean)) {
                                dispatched += hist.qty;
                            }
                        });

                        const master = Number(item.masterQty) || 0;
                        const pending = Math.max(0, master - dispatched);

                        newStats[masterClean] = { dispatched, master, pending };

                        return {
                            id: Date.now() + index,
                            desc: item.desc,
                            qty: '',
                            amount: '',
                            masterQty: master,
                            dispatchedSoFar: dispatched,
                            pendingQty: pending
                        };
                    });
                    setItems(newItems);
                    setStats(newStats);
                } else {
                    setItems([{ id: Date.now(), desc: '', qty: '', amount: '', masterQty: 0, dispatchedSoFar: 0, pendingQty: 0 }]);
                    setStats({});
                }
            } catch (err) {
                console.error('Error tracking quantities:', err);
                setItems([{ id: Date.now(), desc: '', qty: '', amount: '', masterQty: 0, dispatchedSoFar: 0, pendingQty: 0 }]);
            }
        } else {
            setItems([{ id: Date.now(), desc: '', qty: '', amount: '', masterQty: 0, dispatchedSoFar: 0, pendingQty: 0 }]);
            setStats({});
        }
    };

    const runOcr = async (filename, dataUrl) => {
        setIsOcrRunning(true);
        setOcrStatus('Running OCR...');
        try {
            const apiUrl = import.meta.env.VITE_GOOGLE_CLIENTS_API_URL;
            if (!apiUrl) throw new Error('API URL not configured');

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'ocr', filename, dataUrl })
            });
            const result = await res.json();
            console.log("OCR Result:", result); // Debugging log

            if (result.status === 'success' || result.ok) {
                // If it's the sophisticated DocAI parser from appscript.txt
                const ocrItems = result.items || [];
                // If it's the simpler Drive OCR from recommended_app_script.gs
                // we might only get text or tracking info. 
                // But the user said it was working for invoice items before.

                if (ocrItems.length > 0) {
                    const mappedItems = ocrItems.map((it, idx) => ({
                        id: Date.now() + idx,
                        desc: it.desc || '',
                        qty: it.qty || '',
                        amount: it.amount || '',
                        masterQty: 0,
                        dispatchedSoFar: 0,
                        pendingQty: 0
                    }));
                    setItems(mappedItems);
                    setOcrStatus('OCR Successful!');
                } else if (result.text) {
                    setOcrStatus('OCR Done (no items found)');
                    // Show raw text in console for debugging "no items found" cases
                    console.log("Raw OCR Text:", result.text);
                } else {
                    setOcrStatus('OCR completed with no specific results');
                }
            } else {
                throw new Error(result.message || result.msg || 'OCR failed');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            setOcrStatus(`OCR Error: ${error.message}`);
        } finally {
            setIsOcrRunning(false);
            setTimeout(() => setOcrStatus(''), 5000);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            runOcr(file.name, event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!formData.clientName || !formData.projectName) {
            alert('Please select client and project.');
            return;
        }

        setIsSaving(true);
        try {
            const totalData = calculateTotal();
            const dispatch_id = `${formData.date}-IDE-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            // 1. Insert Master Dispatch Record
            const { data: dispatchRecord, error: dispatchError } = await supabase
                .from('dispatches')
                .insert([{
                    dispatch_id,
                    date: formData.date,
                    client_name: formData.clientName,
                    project_name: formData.projectName,
                    ship_to_address: formData.shipToAddress,
                    ship_to_poc: formData.shipToPoc,
                    ship_to_phone: formData.shipToPhone,
                    ship_to_email: formData.shipToEmail,
                    ship_to_mode: shipToMode,
                    dispatch_data: {
                        items: items.map(i => ({ desc: i.desc, qty: i.qty, amount: i.amount, masterQty: i.masterQty })),
                        totals: totalData
                    }
                }])
                .select()
                .single();

            if (dispatchError) throw dispatchError;

            // 2. Insert Relational Line Items for Tracking
            const relationalItems = items.map(i => ({
                dispatch_id: dispatchRecord.id, // Reference the UUID
                description: i.desc,
                quantity: Number(i.qty) || 0,
                amount: Number(i.amount) || 0,
                master_qty: Number(i.masterQty) || 0
            }));

            if (relationalItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from('dispatch_items')
                    .insert(relationalItems);
                if (itemsError) throw itemsError;
            }

            // 3. Sync to Google Sheets
            const apiUrl = import.meta.env.VITE_GOOGLE_CLIENTS_API_URL;
            if (apiUrl) {
                await fetch(apiUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify({ action: 'create_dispatch', data: dispatchRecord })
                });
            }

            alert('Dispatch saved successfully! ID: ' + dispatch_id);
            // Optional: reset form after success
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving dispatch: ' + (error.message || error));
        } finally {
            setIsSaving(false);
        }
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), desc: '', qty: '', amount: '', masterQty: 0, dispatchedSoFar: 0, pendingQty: 0 }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const calculateTotal = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const gst = subtotal * 0.18;
        return {
            subtotal,
            gst,
            total: subtotal + gst,
            qty: items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
        };
    };

    const totals = calculateTotal();

    return (
        <div className="space-y-6 text-gray-900">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-wide">New Dispatch</h1>
                    <p className="text-xs text-gray-500">Create shipping label + delivery challan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Step 1: Client & Project */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-brand px-4 py-2 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider">Client Info</h2>
                        <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-300">Step 1</span>
                    </div>

                    <div className="p-4 space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-600 block">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-600 block">
                                Client Name {loadingData && <span className="text-gray-400 font-normal opacity-50 ml-1">(...)</span>}
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 text-gray-400 w-3 h-3" />
                                <input
                                    list="client-options"
                                    type="text"
                                    placeholder="Search client..."
                                    value={formData.clientName}
                                    onChange={handleClientChange}
                                    className="pl-8 w-full text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none"
                                />
                                <datalist id="client-options">
                                    {clients.map((c, i) => (
                                        <option key={i} value={c.name} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-600 block">Project</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 text-gray-400 w-3 h-3" />
                                <input
                                    list="project-options"
                                    type="text"
                                    placeholder={formData.clientName ? "Search or type project..." : "Select client first..."}
                                    value={formData.projectName}
                                    onChange={handleProjectChange}
                                    disabled={!formData.clientName}
                                    className="pl-8 w-full text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none disabled:bg-gray-100"
                                />
                                <datalist id="project-options">
                                    {selectedClient?.projects?.map((p, i) => (
                                        <option key={i} value={p.name} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-300 block mb-3">Shipment Destination</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="shipto" checked={shipToMode === 'client'} onChange={() => setShipToMode('client')} className="accent-gray-900 w-3 h-3" />
                                    <span className={cn("text-[10px] font-black uppercase tracking-wider", shipToMode === 'client' ? "text-gray-900" : "text-gray-400")}>Direct to Client</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="shipto" checked={shipToMode === 'installer'} onChange={() => setShipToMode('installer')} className="accent-gray-900 w-3 h-3" />
                                    <span className={cn("text-[10px] font-black uppercase tracking-wider", shipToMode === 'installer' ? "text-gray-900" : "text-gray-400")}>Via Installer</span>
                                </label>
                            </div>
                        </div>

                        {shipToMode === 'installer' && (
                            <div className="space-y-1 bg-brand/10 p-3 rounded-xl border border-brand/20">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Select Installer</label>
                                <select
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-white outline-none font-bold"
                                    onChange={handleInstallerChange}
                                >
                                    <option value="">Choose Installer...</option>
                                    {installers.map((inst, i) => (
                                        <option key={i} value={inst.name}>{inst.name} — {inst.city}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2: Shipping Details */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-brand px-4 py-2 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider">Shipping Details</h2>
                        <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-300">Step 2</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-600 block">POC Name</label>
                            <input
                                type="text"
                                value={formData.shipToPoc}
                                onChange={e => setFormData({ ...formData, shipToPoc: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-600 block">Phone</label>
                            <input
                                type="text"
                                value={formData.shipToPhone}
                                onChange={e => setFormData({ ...formData, shipToPhone: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-600 block">Address</label>
                            <textarea
                                rows={3}
                                value={formData.shipToAddress}
                                onChange={e => setFormData({ ...formData, shipToAddress: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white outline-none resize-none"
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Step 3: Invoice / OCR */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                    <div className="bg-brand px-4 py-3 flex items-center justify-between border-b border-[#dcd62e]">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Step 3: <span className="text-gray-600">Invoice / OCR</span> (Optional)</h2>
                        <span className="bg-white/50 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold border border-brand/30">Step 3</span>
                    </div>
                    <div
                        onClick={() => !isOcrRunning && fileInputRef.current?.click()}
                        className={cn(
                            "p-4 flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg m-4 transition-colors cursor-pointer group",
                            isOcrRunning ? "bg-gray-100 border-brand" : "bg-gray-50 border-gray-100 hover:border-brand"
                        )}
                    >
                        {isOcrRunning ? (
                            <Loader2 className="text-brand animate-spin mb-2" size={24} />
                        ) : (
                            <Upload className="text-gray-300 group-hover:text-brand transition-colors mb-2" size={24} />
                        )}
                        <p className="text-xs font-medium text-gray-500">
                            {isOcrRunning ? 'Processing Invoice...' : 'Upload Invoice PDF/Image'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {ocrStatus || 'AI auto-fill items'}
                        </p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="application/pdf,image/*"
                            className="hidden"
                        />
                    </div>
                </div>

            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-brand px-4 py-2 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Line Items</h2>
                    <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-300">Details</span>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center">#</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 w-24">Qty</th>
                                <th className="px-4 py-3 w-32">Amount (₹)</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item, idx) => {
                                const totalDispatched = (Number(item.dispatchedSoFar) || 0) + (Number(item.qty) || 0);
                                const isExceeded = item.masterQty > 0 && totalDispatched > item.masterQty;
                                const isReached = item.masterQty > 0 && totalDispatched === item.masterQty;

                                return (
                                    <tr key={item.id} className={cn("hover:bg-gray-50 group", isExceeded && "bg-red-50")}>
                                        <td className="px-4 py-2 text-center text-gray-400">{idx + 1}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex flex-col">
                                                <input
                                                    type="text"
                                                    value={item.desc}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[idx].desc = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                    className="w-full bg-transparent outline-none border-b border-transparent focus:border-brand py-1 font-medium"
                                                    placeholder="Item description"
                                                />
                                                <div className="flex flex-col gap-1 mt-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                                                            Master: {item.masterQty} | Dispatched: {item.dispatchedSoFar} | <span className="text-brand-hover font-black">Pending: {item.pendingQty}</span>
                                                        </span>
                                                    </div>
                                                    {isExceeded && (
                                                        <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded animate-pulse w-fit">
                                                            QTY EXCEEDED
                                                        </span>
                                                    )}
                                                    {isReached && (
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded w-fit">
                                                            QTY COMPLETED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    const newItems = [...items];
                                                    newItems[idx].qty = e.target.value;
                                                    newItems[idx].amount = val * 750; // Suggested logic
                                                    setItems(newItems);

                                                    // Alert on Breach/Reach
                                                    if (item.masterQty > 0) {
                                                        const total = (Number(item.dispatchedSoFar) || 0) + val;
                                                        if (total > item.masterQty) {
                                                            alert(`⚠️ WARNING: Total quantity for "${item.desc}" (${total}) exceeds Master Qty (${item.masterQty})!`);
                                                        } else if (total === item.masterQty) {
                                                            alert(`✅ NOTE: Master quantity reached for "${item.desc}". Project complete.`);
                                                        }
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full bg-transparent outline-none border-b border-transparent focus:border-brand py-1 text-right font-black",
                                                    isExceeded && "text-red-600"
                                                )}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <input
                                                type="number"
                                                value={item.amount}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[idx].amount = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full bg-transparent outline-none border-b border-transparent focus:border-brand py-1 text-right"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <button onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-800 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm hover:shadow-md transition-all">
                        <Plus size={14} className="text-[#dcd62e]" /> Add Item
                    </button>

                    <div className="flex flex-wrap gap-4 sm:gap-6 text-[10px] sm:text-xs text-gray-600 font-medium w-full sm:w-auto">
                        <div className="flex-1 min-w-[80px]">Total Qty: <span className="font-bold text-gray-900">{totals.qty}</span></div>
                        <div className="flex-1 min-w-[80px]">Subtotal: <span className="font-bold text-gray-900">₹{totals.subtotal.toLocaleString()}</span></div>
                        <div className="flex-1 min-w-[80px]">GST (18%): <span className="font-bold text-gray-900">₹{totals.gst.toLocaleString()}</span></div>
                        <div className="text-sm sm:text-lg w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">Total: <span className="font-bold text-gray-900">₹{totals.total.toLocaleString()}</span></div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 disabled:opacity-50 w-full sm:w-auto shadow-sm"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                    {isSaving ? 'Saving...' : 'Save Dispatch'}
                </button>
                <button
                    onClick={() => setShowPreview(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gray-900 text-white border border-transparent text-xs font-bold hover:bg-gray-800 shadow-lg w-full sm:w-auto"
                >
                    <Printer size={16} />
                    Generate Dispatch PDF
                </button>
            </div>

            {showPreview && (
                <DispatchPreview
                    data={{
                        dispatch_id: formData.dispatchId || 'DRAFT',
                        date: formData.date || new Date().toISOString().split('T')[0],
                        client_name: formData.clientName,
                        project_name: formData.projectName,
                        ship_to_address: formData.shipToAddress,
                        ship_to_poc: formData.shipToPoc,
                        ship_to_phone: formData.shipToPhone,
                        ship_to_email: formData.shipToEmail,
                        items,
                    }}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}
