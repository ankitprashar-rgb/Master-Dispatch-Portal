import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register Fonts
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' },
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        backgroundColor: '#FFFFFF'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 10
    },
    logo: {
        width: 100,
        height: 40,
        objectFit: 'contain'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        alignSelf: 'center'
    },
    section: {
        marginBottom: 10
    },
    labelBox: {
        borderWidth: 2,
        borderColor: '#000000',
        padding: 20,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    labelText: {
        fontSize: 14,
        marginBottom: 5,
        textAlign: 'center'
    },
    labelTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5
    },
    col: {
        flex: 1
    },
    table: {
        display: 'table',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginTop: 20
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row'
    },
    tableCol: {
        width: '15%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0
    },
    tableColDesc: {
        width: '40%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0
    },
    tableCell: {
        margin: 'auto',
        marginTop: 5,
        marginBottom: 5,
        fontSize: 9,
        paddingLeft: 4
    },
    tableHeader: {
        backgroundColor: '#F3F4F6',
        fontWeight: 'bold'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: 'gray',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 10
    }
});

// Helper for currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
};

export default function DispatchPDF({ data }) {
    const normalizedData = {
        dispatchId: data.dispatch_id || data.dispatchId || 'DRAFT',
        date: data.date || new Date(),
        clientName: data.client_name || data.clientName || 'N/A',
        projectName: data.project_name || data.projectName || 'N/A',
        shipToAddress: data.ship_to_address || data.shipToAddress || 'N/A',
        shipToPoc: data.ship_to_poc || data.shipToPoc || 'N/A',
        shipToPhone: data.ship_to_phone || data.shipToPhone || 'N/A',
        items: (() => {
            let rawItems = [];
            if (data.items && data.items.length > 0) {
                rawItems = data.items.map(i => ({ desc: i.desc, qty: i.qty, amount: i.amount, masterQty: i.masterQty }));
            } else if (data.dispatch_items && data.dispatch_items.length > 0) {
                rawItems = data.dispatch_items.map(i => ({ desc: i.description, qty: i.quantity, amount: i.amount, masterQty: i.master_qty }));
            } else if (data.dispatch_data?.items && data.dispatch_data.items.length > 0) {
                rawItems = data.dispatch_data.items.map(i => ({ desc: i.desc, qty: i.qty, amount: i.amount, masterQty: i.masterQty }));
            }
            return rawItems.filter(i => Number(i.qty) > 0);
        })()

    };

    const {
        dispatchId,
        date,
        clientName,
        projectName,
        shipToAddress,
        shipToPoc,
        shipToPhone,
        items
    } = normalizedData;

    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    const subtotal = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    return (
        <Document>
            {/* PAGE 1: SHIPPING LABEL */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Image style={styles.logo} src="https://res.cloudinary.com/du5vwtwvr/image/upload/v1762093742/IDE_Black_igvryv.png" />
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 10, color: 'gray' }}>Dispatch ID: {dispatchId}</Text>
                        <Text style={{ fontSize: 10, color: 'gray' }}>Date: {format(new Date(date), 'dd MMM yyyy')}</Text>
                    </View>
                </View>

                <View style={styles.labelBox}>
                    <Text style={styles.labelTitle}>SHIPPING LABEL</Text>

                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: 'gray', marginBottom: 5 }}>SHIP TO:</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{shipToPoc || clientName}</Text>
                        <Text style={styles.labelText}>{clientName}</Text>
                        <Text style={styles.labelText}>{shipToAddress}</Text>
                        <Text style={{ fontSize: 12, marginTop: 5 }}>Phone: {shipToPhone}</Text>
                    </View>

                    <View style={{ marginTop: 40, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20, width: '100%' }}>
                        <Text style={{ fontSize: 10, color: 'gray' }}>PROJECT:</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{projectName}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text>IDE Autoworks | 192, Sector 27, Gurugram, Haryana - 122009</Text>
                </View>
            </Page>

            {/* PAGE 2: DELIVERY CHALLAN */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Image style={styles.logo} src="https://res.cloudinary.com/du5vwtwvr/image/upload/v1762093742/IDE_Black_igvryv.png" />
                    <Text style={styles.title}>DELIVERY CHALLAN</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                    <View style={{ width: '45%' }}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Bill To / Client:</Text>
                        <Text>{clientName}</Text>
                        <Text>Project: {projectName}</Text>
                    </View>
                    <View style={{ width: '45%' }}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Ship To:</Text>
                        <Text>{shipToPoc}</Text>
                        <Text>{shipToAddress}</Text>
                        <Text>Phone: {shipToPhone}</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={[styles.tableCol, { width: '10%' }]}>
                            <Text style={styles.tableCell}>S.No</Text>
                        </View>
                        <View style={[styles.tableColDesc, { width: '50%' }]}>
                            <Text style={styles.tableCell}>Description</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '15%' }]}>
                            <Text style={styles.tableCell}>Qty</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>Amount</Text>
                        </View>
                    </View>

                    {items.map((item, index) => (
                        <View style={styles.tableRow} key={index}>
                            <View style={[styles.tableCol, { width: '10%' }]}>
                                <Text style={styles.tableCell}>{index + 1}</Text>
                            </View>
                            <View style={[styles.tableColDesc, { width: '50%' }]}>
                                <Text style={styles.tableCell}>{item.desc}</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '15%' }]}>
                                <Text style={styles.tableCell}>{item.qty}</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '25%' }]}>
                                <Text style={styles.tableCell}>{formatCurrency(item.amount)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
                    <Text style={{ marginBottom: 5 }}>Total Qty: {totalQty}</Text>
                    <Text style={{ marginBottom: 5 }}>Subtotal: {formatCurrency(subtotal)}</Text>
                    <Text style={{ marginBottom: 5 }}>GST (18%): {formatCurrency(gst)}</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 12 }}>Grand Total: {formatCurrency(total)}</Text>
                </View>

                <View style={styles.footer}>
                    <Text>This is a computer generated document.</Text>
                </View>
            </Page>
        </Document>
    );
}
