import React from 'react';
import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const IDE_LOGO = "https://res.cloudinary.com/du5vwtwvr/image/upload/v1762093742/IDE_Black_igvryv.png";

export default function DispatchPreview({ data, onClose, onPrintSuccess }) {
    if (!data) return null;

    // Unified Items Logic (Prioritize Form -> Relational -> JSONB)
    let rawItems = [];
    if (data.items && data.items.length > 0) {
        rawItems = data.items.map(i => ({ desc: i.desc, qty: i.qty, amount: i.amount, rate: i.rate || (Number(i.qty) > 0 ? Number(i.amount) / Number(i.qty) : 0) }));
    } else if (data.dispatch_items && data.dispatch_items.length > 0) {
        rawItems = data.dispatch_items.map(i => ({
            desc: i.description,
            qty: i.quantity,
            amount: i.amount,
            rate: i.quantity > 0 ? i.amount / i.quantity : 0
        }));
    } else if (data.dispatch_data?.items && data.dispatch_data.items.length > 0) {
        rawItems = data.dispatch_data.items.map(i => ({ desc: i.desc, qty: i.qty, amount: i.amount, rate: i.rate || (Number(i.qty) > 0 ? Number(i.amount) / Number(i.qty) : 0) }));
    }

    // Filter out items with 0 quantity
    const items = rawItems.filter(i => Number(i.qty) > 0);

    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    const subTotal = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const gstAmount = subTotal * 0.18;
    const totalAmount = subTotal + gstAmount;

    const handlePrint = () => {
        window.print();
        // The user wants to mark it as sent/saved after printing
        if (onPrintSuccess) onPrintSuccess(data.id);
    };

    const addressLines = (data.ship_to_address || data.dispatch_data?.shipToAddress || '').split('\n');

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
            {/* Controls - Hidden on Print */}
            <div className="fixed top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-2 sm:gap-3 no-print z-[110]">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-white text-gray-900 border border-gray-200 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-gray-50 transition-all text-[10px] sm:text-xs"
                >
                    <Printer size={16} className="text-[#d4de47]" /> Print
                </button>
                <button
                    onClick={onClose}
                    className="p-2 sm:p-3 bg-gray-900 text-white rounded-xl sm:rounded-2xl transition-all shadow-xl hover:bg-red-500"
                >
                    <X size={20} />
                </button>
            </div>

            {/* A4 Page Container - this is what gets printed */}
            <div className="bg-[#D4DE47] p-2 overflow-y-auto max-h-screen print-area">
                <div className="page-container bg-white w-[210mm] min-h-[297mm] mx-auto p-[10mm] shadow-2xl rounded-lg">

                    {/* SECTION 1: SHIPPING LABEL (TOP HALF) */}
                    <div className="border border-gray-200 rounded-xl p-6 relative">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-4 border-[#D4DE47] pb-4 mb-4">
                            <img src={IDE_LOGO} alt="IDE Logo" className="h-12 w-auto" />
                            <div className="text-right text-[11px] leading-tight">
                                <p className="font-bold text-sm">Focus Auto Designworks Pvt. Ltd.</p>
                                <p>192, Sector 27, Gurugram, Haryana – 122009</p>
                                <p>+91 9717498343 | +91 9910027535</p>
                                <p className="text-gray-500">www.IDEautoworks.com</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black uppercase tracking-widest text-gray-900">Shipping Label</h3>
                            <span className="px-3 py-1 bg-[#D4DE47] rounded-full text-[10px] font-black uppercase">Dispatch Copy</span>
                        </div>

                        <div className="flex justify-between text-xs font-bold mb-4">
                            <p>DISPATCH ID: <span className="font-black underline">{data.dispatch_id}</span></p>
                            <p>DATE: {format(new Date(data.date), 'dd/MM/yyyy')}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-heading">Deliver To</p>
                                <p className="font-black text-sm uppercase">{data.client_name}</p>
                                <div className="text-xs text-gray-600 mt-1 whitespace-pre-line font-medium leading-relaxed">
                                    {data.ship_to_address || data.dispatch_data?.shipToAddress}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 font-medium font-headings">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-heading">Contact Info</p>
                                <p className="text-xs">POC: <span className="font-bold">{data.ship_to_poc || data.dispatch_data?.shipToPoc || 'N/A'}</span></p>
                                <p className="text-xs mt-1">PHONE: <span className="font-bold">{data.ship_to_phone || data.dispatch_data?.shipToPhone || 'N/A'}</span></p>
                                <p className="text-xs mt-1">EMAIL: <span className="font-bold text-blue-600">{data.ship_to_email || data.dispatch_data?.shipToEmail || data.client_email || 'N/A'}</span></p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Items Manifest</h4>
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#D4DE47]">
                                        <th className="border border-gray-200 p-2 text-left font-black uppercase">Description</th>
                                        <th className="border border-gray-200 p-2 text-right w-20 font-black uppercase">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-gray-200 p-2 font-bold">{item.desc}</td>
                                            <td className="border border-gray-200 p-2 text-right font-black">{item.qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-black">
                                    <tr>
                                        <td className="border border-gray-200 p-2 text-right uppercase tracking-[0.2em] text-gray-400">Total Units</td>
                                        <td className="border border-gray-200 p-2 text-right">{totalQty}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="mt-4 text-[10px] text-gray-400 leading-relaxed italic border-t border-gray-100 pt-4">
                            <strong>Note:</strong> This is a shipping label and not a tax invoice. Please inspect the package on delivery and report any damage within 24 hours.
                        </div>
                    </div>

                    {/* TEAR LINE */}
                    <div className="my-8 border-t-2 border-dashed border-gray-300 relative">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Cut / Tear Here</span>
                    </div>

                    {/* SECTION 2: DELIVERY CHALLAN (BOTTOM HALF) */}
                    <div className="border border-gray-200 rounded-xl p-6">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-4 border-[#D4DE47] pb-4 mb-4">
                            <img src={IDE_LOGO} alt="IDE Logo" className="h-12 w-auto" />
                            <div className="text-right text-[11px] leading-tight text-gray-900 font-bold">
                                <p className="text-sm">Focus Auto Designworks Pvt. Ltd.</p>
                                <p>192, Sector 27, Gurugram, Haryana – 122009</p>
                                <p>+91 9717498343 | +91 9910027535</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase tracking-widest text-gray-900 underline underline-offset-8 decoration-[#D4DE47]">Delivery Challan</h3>
                            <span className="px-3 py-1 bg-[#D4DE47] text-gray-900 rounded-full text-[10px] font-black uppercase border border-gray-200">Client Copy</span>
                        </div>

                        <div className="grid grid-cols-3 border border-gray-200 rounded-xl overflow-hidden text-center mb-6">
                            <div className="p-3 border-r border-gray-200 bg-gray-50">
                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">Challan / Dispatch ID</p>
                                <p className="text-sm font-black text-gray-900 mt-1 underline">{data.dispatch_id}</p>
                            </div>
                            <div className="p-3 border-r border-gray-200">
                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">Issue Date</p>
                                <p className="text-sm font-black text-gray-900 mt-1">{format(new Date(data.date), 'dd MMM yyyy')}</p>
                            </div>
                            <div className="p-3 bg-gray-50 text-red-500">
                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">E-Way Bill</p>
                                <p className="text-xs font-black mt-1">REQUIRED IF {'>'} ₹50K</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-heading">Billing & Delivery Address</p>
                                    <p className="font-black text-sm uppercase">{data.client_name}</p>
                                    <div className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">
                                        {data.ship_to_address || data.dispatch_data?.shipToAddress}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-heading">Receiver Point of Contact</p>
                                    <p className="text-xs font-bold leading-relaxed">
                                        NAME: {data.ship_to_poc || data.dispatch_data?.shipToPoc || 'N/A'}<br />
                                        PHONE: {data.ship_to_phone || data.dispatch_data?.shipToPhone || 'N/A'}<br />
                                        EMAIL: {data.ship_to_email || data.dispatch_data?.shipToEmail || data.client_email || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-6">
                            <table className="w-full text-xs">
                                <thead className="bg-[#D4DE47]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-black uppercase">#</th>
                                        <th className="px-4 py-3 text-left font-black uppercase">Technical Description</th>
                                        <th className="px-4 py-3 text-right w-20 font-black uppercase">Qty</th>
                                        <th className="px-4 py-3 text-right w-24 font-black uppercase">Rate</th>
                                        <th className="px-4 py-3 text-right w-28 font-black uppercase">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-100">
                                            <td className="px-4 py-2.5 text-gray-400 font-bold">{idx + 1}</td>
                                            <td className="px-4 py-2.5 font-bold">{item.desc}</td>
                                            <td className="px-4 py-2.5 text-right font-black">{item.qty}</td>
                                            <td className="px-4 py-2.5 text-right font-medium text-gray-500">₹{parseFloat(item.rate || 0).toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-gray-900">₹{parseFloat(item.amount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold">
                                    <tr className="bg-gray-50/50">
                                        <td colSpan="2" className="px-4 py-2 text-right uppercase text-[9px] tracking-widest text-gray-400">Base Subtotal</td>
                                        <td className="px-4 py-2 text-right font-black">{totalQty}</td>
                                        <td className=""></td>
                                        <td className="px-4 py-2 text-right">₹{subTotal.toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-gray-50/50">
                                        <td colSpan="4" className="px-4 py-2 text-right uppercase text-[9px] tracking-widest text-gray-400">GST IGST (18%)</td>
                                        <td className="px-4 py-2 text-right">₹{gstAmount.toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-[#D4DE47] text-gray-900 font-black">
                                        <td colSpan="4" className="px-4 py-4 text-right uppercase tracking-[0.2em]">Total Payable (incl Tax)</td>
                                        <td className="px-4 py-4 text-right">₹{totalAmount.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-10 mt-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Receiver Acknowledgment</p>
                                    <div className="h-20 border-b border-gray-200 border-dashed"></div>
                                    <p className="text-[9px] font-bold text-gray-400">Authorized Signatory & Stamp</p>
                                </div>
                                <div className="text-[9px] text-gray-400 space-y-1">
                                    <p className="font-bold uppercase tracking-tighter">Terms & Conditions:</p>
                                    <ul className="list-disc pl-3">
                                        <li>Goods once sold will not be taken back or exchanged.</li>
                                        <li>Any shortages or damages must be reported on the same day.</li>
                                        <li>Interest at 24% p.a. will be charged for delayed payments.</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex flex-col justify-end items-end space-y-2">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">For Focus Auto Designworks Pvt. Ltd.</p>
                                <div className="h-16 w-40 border-b border-gray-200 border-dashed"></div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Authorized Signature</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Print Specific CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Hide everything first */
                    body * { visibility: hidden !important; }
                    
                    /* Only show print-area and all its children */
                    .print-area,
                    .print-area * { visibility: visible !important; }

                    /* No-print elements are fully hidden */
                    .no-print { display: none !important; }

                    /* Position the print area to fill the page */
                    .print-area {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    
                    /* Clean up page container */
                    .page-container {
                        width: 100% !important;
                        min-height: auto !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 10mm !important;
                    }

                    @page {
                        size: A4;
                        margin: 0;
                    }

                    /* Preserve colors and backgrounds */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}} />
        </div>
    );
}
