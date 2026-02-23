import React, { useState, useRef } from 'react';
import { ChevronRight, MapPin, Truck, FileText, Upload, ExternalLink, Mail, X, Save, Edit2, Trash2, Printer, Archive, Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export default function DispatchCard({
    data,
    mode = 'dashboard', // dashboard or summary
    onUpdate,
    onDelete,
    onViewPdf,
    onNotify
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [ocrCandidates, setOcrCandidates] = useState([]);
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isOcrSuccess, setIsOcrSuccess] = useState(false);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [isEmailSuccess, setIsEmailSuccess] = useState(false);
    const [email, setEmail] = useState(data.client_email || data.dispatch_data?.clientEmail || '');
    const fileInputRef = useRef(null);

    // Status Logic
    const isSent = !!data.email_sent_at;
    const isArchived = !!data.is_archived;
    const hasTrackingInfo = !!(data.tracking_id || data.courier_company || data.courier_slip_url || data.dispatch_data?.trackingId || data.dispatch_data?.courierCompany || data.dispatch_data?.courierSlipUrl);
    const isProcessed = !isSent && hasTrackingInfo;
    const isPending = !isSent && !isProcessed;

    // Unified Items Logic (Prefer relational items, fallback to JSONB)
    const items = (data.dispatch_items && data.dispatch_items.length > 0)
        ? data.dispatch_items.map(i => ({ desc: i.description, qty: i.quantity, amount: i.amount, masterQty: i.master_qty }))
        : (data.dispatch_data?.items?.map(i => ({ desc: i.desc, qty: i.qty, amount: i.amount, masterQty: i.masterQty })) || []);
    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    const totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const handleEmailUpdate = (e) => {
        setEmail(e.target.value);
    };

    const handleSaveEmail = () => {
        onUpdate(data.id, 'client_email', email);
    };

    const handleArchive = () => {
        onUpdate(data.id, 'is_archived', !isArchived);
    };

    const handleOcrUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsOcrLoading(true);
        setOcrCandidates([]);
        try {
            const reader = new FileReader();
            const dataUrl = await new Promise((res, rej) => {
                reader.onload = () => res(reader.result);
                reader.onerror = rej;
                reader.readAsDataURL(file);
            });

            // Call Google Apps Script OCR if key is present, else mock
            const apiUrl = import.meta.env.VITE_GOOGLE_CLIENTS_API_URL;
            console.log("Attempting OCR fetch to:", apiUrl);

            if (apiUrl) {
                try {
                    // Send to Apps Script for actual OCR processing
                    // Google Apps Script requires text/plain to avoid CORS preflight OPTIONS request
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'text/plain',
                        },
                        body: JSON.stringify({
                            action: 'ocr',
                            filename: file.name,
                            dataUrl: dataUrl
                        })
                    });

                    // Try to parse JSON.
                    const result = await response.json();

                    // Check for ok: true OR status: 'success'
                    if (result.ok || result.status === 'success') {
                        // Store candidates for UI selection
                        if (result.candidates && result.candidates.length > 0) {
                            setOcrCandidates(result.candidates);
                        }

                        if (result.detectedTrackingId) {
                            onUpdate(data.id, 'tracking_id', result.detectedTrackingId);
                            if (result.detectedCourier) {
                                onUpdate(data.id, 'courier_company', result.detectedCourier);
                            } else if (result.detectedTrackingId.match(/^[0-9]{11}$/)) {
                                onUpdate(data.id, 'courier_company', 'BlueDart');
                            }
                            setIsOcrSuccess(true);
                            setTimeout(() => setIsOcrSuccess(false), 3000);
                        }
                    } else {
                        console.error("OCR API returned an error status.", result.message || result.msg);
                    }

                } catch (fetchErr) {
                    console.error("OCR Fetch Error:", fetchErr);
                }
            }

            setIsOcrLoading(false);

        } catch (error) {
            console.error('OCR Error:', error);
            setIsOcrLoading(false);
        }
    };

    const handleSendEmail = async () => {
        setIsEmailLoading(true);
        try {
            await onNotify?.({ ...data, client_email: email });
            setIsEmailSuccess(true);
            setTimeout(() => setIsEmailSuccess(false), 3000);
        } catch (e) {
            console.error("Email failed:", e);
        } finally {
            setIsEmailLoading(false);
        }
    };

    return (
        <>
            {/* COLLAPSED CARD (Grid Item) */}
            <div
                className={cn(
                    "bg-white rounded-xl border-2 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden h-full flex flex-col",
                    isSent ? "border-[#d4de47]" : isProcessed ? "border-blue-500/50 hover:border-blue-500" : "border-red-500/50 hover:border-red-500"
                )}
                onClick={() => setIsOpen(true)}
            >
                {/* Status Indicator Bar */}
                <div className={cn(
                    "h-1 w-full",
                    isSent ? "bg-[#d4de47]" : isProcessed ? "bg-blue-500" : "bg-red-500"
                )} />

                <div className="p-4 flex flex-col gap-3 h-full">
                    {/* Header: Date & Status */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg w-10 h-10 border border-gray-100">
                            <span className="text-[9px] font-black text-gray-400 uppercase">{format(new Date(data.date), 'MMM')}</span>
                            <span className="text-sm font-black text-gray-900 leading-none">{format(new Date(data.date), 'dd')}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {isSent ? (
                                <span className="px-2 py-0.5 rounded-full bg-[#d4de47]/10 text-[#545c1d] text-[10px] font-black border border-[#d4de47]/20 flex items-center gap-1 uppercase tracking-tighter">
                                    <Mail size={8} /> Sent
                                </span>
                            ) : isProcessed ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100 flex items-center gap-1 uppercase tracking-tighter">
                                    <Truck size={8} /> Processed
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-black border border-red-100 flex items-center gap-1 uppercase tracking-tighter">
                                    <FileText size={8} /> Pending
                                </span>
                            )}
                            {isArchived && (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold border border-gray-200 uppercase tracking-widest">
                                    Archived
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <h3 className="font-black text-sm text-gray-900 line-clamp-1 uppercase tracking-tight" title={data.client_name}>{data.client_name}</h3>
                        <p className="text-[10px] font-bold text-gray-500 line-clamp-1 mt-0.5" title={data.project_name}>{data.project_name}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-brand text-gray-900 border border-gray-400 uppercase tracking-widest">
                                {data.dispatch_id}
                            </span>
                        </div>
                    </div>

                    {/* Footer: Quick Actions */}
                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 -mx-4 -mb-4 px-4 py-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{totalQty} Units</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                                className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-brand transition-colors shadow-sm"
                            >
                                <Edit2 size={12} className="text-gray-600" />
                            </button>
                            {onViewPdf && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewPdf(data); }}
                                    className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-brand transition-colors shadow-sm"
                                >
                                    <FileText size={12} className="text-gray-600" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Delete this dispatch entry?')) onDelete(data.id);
                                    }}
                                    className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </div>

            {/* EXPANDED MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-[#d4de47] text-gray-900 px-5 py-5 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 border-b border-gray-200 gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black uppercase tracking-tight font-heading">{data.client_name}</h2>
                                    <span className="px-3 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">{data.dispatch_id}</span>
                                </div>
                                <p className="text-[10px] text-gray-700 font-bold mt-1.5 uppercase tracking-widest opacity-70">
                                    {data.project_name} <span className="mx-2">•</span> {format(new Date(data.date), 'PPPP')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleArchive}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm premium-btn border",
                                        isArchived
                                            ? "bg-amber-500 border-amber-600 text-white shadow-amber-200"
                                            : "bg-gray-900 border-gray-900 text-white hover:bg-gray-800"
                                    )}
                                    title={isArchived ? "Unarchive" : "Archive Entry"}
                                >
                                    <Archive size={14} /> {isArchived ? "Archived" : "Archive"}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2.5 bg-gray-900/10 hover:bg-red-500/10 rounded-2xl text-gray-900 hover:text-red-600 transition-all border border-transparent hover:border-red-500/20"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 sm:p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">

                            {/* LEFT COLUMN: Data & Details */}
                            <div className="lg:col-span-7 space-y-8">
                                {/* Shipping Address */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                                            <MapPin size={12} className="text-brand" /> Origin & Destination
                                        </h4>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 space-y-1">
                                            <p className="text-[10px] font-black uppercase text-gray-900 tracking-wider">Recipient POC</p>
                                            <p className="text-sm font-black text-gray-900">{data.ship_to_poc || data.dispatch_data?.shipToPoc || 'N/A'}</p>
                                            <p className="text-xs font-bold text-gray-700 mt-2 whitespace-pre-line leading-relaxed">
                                                {data.ship_to_address || data.dispatch_data?.shipToAddress || 'No Address Provided'}
                                            </p>
                                        </div>
                                        <div className="hidden md:block w-px bg-gray-200"></div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-gray-900 tracking-wider">Contact</p>
                                            <p className="text-sm font-black text-gray-900">{data.ship_to_phone || data.dispatch_data?.shipToPhone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                                            <FileText size={12} className="text-brand" /> Manifest Content
                                        </h4>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{items.length} Distinct SKUs</span>
                                            {onViewPdf && (
                                                <button
                                                    onClick={() => onViewPdf(data)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-300 transition-all shadow-sm"
                                                >
                                                    <Printer size={12} /> View Delivery Challan
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm overflow-x-auto bg-white">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50/80 text-gray-500 font-black uppercase tracking-widest border-b border-gray-100">
                                                <tr>
                                                    <th className="px-6 py-5 text-left">Description</th>
                                                    <th className="px-6 py-5 text-right w-24">Qty</th>
                                                    <th className="px-6 py-5 text-right w-32">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-800 uppercase tracking-tight">{item.desc}</span>
                                                                {item.masterQty > 0 && (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#d4de47] bg-gray-900 px-2 py-0.5 rounded mt-1.5 w-fit">
                                                                        Master Qty Ref: {item.masterQty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-gray-900 text-sm">{item.qty}</td>
                                                        <td className="px-6 py-4 text-right font-black text-gray-600">₹{parseFloat(item.amount || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-[#d4de47]/90 text-gray-900 font-black backdrop-blur-sm">
                                                <tr>
                                                    <td className="px-6 py-5 text-right uppercase tracking-[0.2em] font-black">Grand Total</td>
                                                    <td className="px-6 py-5 text-right text-gray-900 text-sm font-black">{totalQty}</td>
                                                    <td className="px-6 py-5 text-right text-sm font-black">₹{totalAmount.toLocaleString()}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Logistics & Control */}
                            <div className="lg:col-span-5 space-y-8">
                                {/* Logistics Status Card */}
                                <div className="bg-[#d4de47] rounded-[2rem] p-6 sm:p-8 text-gray-900 space-y-6 shadow-xl relative overflow-hidden border border-brand-hover">
                                    {/* Decorative background element */}
                                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                        <Truck size={100} strokeWidth={1} />
                                    </div>

                                    <div className="relative z-10 space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between pb-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Tracking Info</h4>
                                                {!isSent && <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-widest animate-pulse">Action Required</span>}
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                disabled={isOcrLoading}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md disabled:opacity-50"
                                            >
                                                {isOcrLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                                                {isOcrLoading ? "Scanning..." : "Upload Courier Slip"}
                                            </button>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-gray-900 tracking-widest">AWB Number</label>
                                                    <div className="group relative">
                                                        <textarea
                                                            rows={2}
                                                            defaultValue={data.tracking_id || ''}
                                                            onBlur={(e) => onUpdate(data.id, 'tracking_id', e.target.value)}
                                                            className="w-full bg-white/50 border border-gray-900/10 rounded-xl px-4 py-3 text-sm font-black text-gray-900 focus:bg-white outline-none transition-all placeholder:text-gray-400 resize-none break-all"
                                                            placeholder="Enter Tracking ID"
                                                        />
                                                        <Edit2 size={12} className="absolute right-3 top-3.5 text-gray-400 group-focus-within:hidden" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-gray-900 tracking-widest">Courier Partner</label>
                                                    <textarea
                                                        rows={2}
                                                        defaultValue={data.courier_company || ''}
                                                        onBlur={(e) => onUpdate(data.id, 'courier_company', e.target.value)}
                                                        className="w-full bg-white/50 border border-gray-900/10 rounded-xl px-4 py-3 text-sm font-black text-gray-900 focus:bg-white outline-none transition-all placeholder:text-gray-400 resize-none"
                                                        placeholder="e.g. BlueDart"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-gray-900 tracking-widest">Courier Slip Link</label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1 group">
                                                        <input
                                                            type="url"
                                                            defaultValue={data.courier_slip_url || ''}
                                                            onBlur={(e) => onUpdate(data.id, 'courier_slip_url', e.target.value)}
                                                            className="w-full bg-white/50 border border-gray-900/10 rounded-xl px-4 py-3 text-sm font-black text-gray-900 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                                                            placeholder="Paste URL here..."
                                                        />
                                                    </div>
                                                    {data.courier_slip_url && (
                                                        <a href={data.courier_slip_url} target="_blank" rel="noreferrer" className="flex items-center justify-center aspect-square h-12 bg-white/50 hover:bg-white/70 border border-gray-900/10 rounded-xl text-gray-900 transition-all">
                                                            <ExternalLink size={18} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-900/10 w-full mb-6"></div>

                                        {ocrCandidates.length > 0 && (
                                            <div className="bg-brand/10 border border-brand-hover p-3 rounded-xl space-y-2">
                                                <p className="text-[9px] font-black uppercase text-gray-900 tracking-widest">Suggestions (Found {ocrCandidates.length})</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {ocrCandidates.map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => {
                                                                onUpdate(data.id, 'tracking_id', c);
                                                                setOcrCandidates([]);
                                                            }}
                                                            className="px-2 py-1 bg-white border border-gray-900/10 rounded-lg text-[10px] font-black text-gray-900 hover:bg-brand transition-colors"
                                                        >
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Client Communication</h4>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-gray-900 tracking-widest">Destination Inbox</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={handleEmailUpdate}
                                                        onBlur={handleSaveEmail}
                                                        className="flex-1 bg-white/50 border border-gray-900/10 rounded-xl px-4 py-3 text-sm font-black text-gray-900 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                                                        placeholder="client@email.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 pt-4">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*,application/pdf"
                                                onChange={handleOcrUpload}
                                            />
                                            {!isSent ? (
                                                <button
                                                    onClick={handleSendEmail}
                                                    disabled={isEmailLoading || isEmailSuccess}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2 py-3 px-2 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 w-full",
                                                        isEmailSuccess
                                                            ? "bg-green-500 hover:bg-green-600 text-white"
                                                            : "bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50"
                                                    )}
                                                >
                                                    {isEmailLoading ? <Loader2 size={14} className="shrink-0 animate-spin" /> : (isEmailSuccess ? <Check size={14} className="shrink-0" /> : <Mail size={14} className="shrink-0" />)}
                                                    {isEmailLoading ? "Sending..." : (isEmailSuccess ? "Sent" : "Send Dispatch Email")}
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 py-3 px-2 bg-[#d4de47]/50 border border-brand-hover text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                                    <Mail size={13} className="shrink-0" /> Sent
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone / Utilities */}
                                <div className="flex items-center justify-between px-2 pt-4">
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                                        >
                                            <Edit2 size={12} /> Edit Draft
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Permanent removal?')) onDelete?.(data.id);
                                        }}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
