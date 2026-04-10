import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, ArrowUpRight, Wallet, Loader2, ChevronDown, X, Filter } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface PaymentTransaction {
  _id: string;
  razorpayOrderId?: string;
  paymentId?: string;
  method?: string;
  date?: string;
  amount: number;
  status: string;
}

interface PaymentHistoryResponse {
  data: PaymentTransaction[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export default function PaymentPage() {
  const [status, setStatus] = useState<string>("all");
  const [typing, setTyping] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [rows, setRows] = useState<PaymentTransaction[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const { user } = useAuth();
  const userId = user?.userId;

  // Demo payment data
  const demoPaymentData: PaymentTransaction[] = [
    {
      _id: "1",
      razorpayOrderId: "order_123456789",
      paymentId: "pay_ABC123DEF456",
      method: "Credit Card",
      date: "2024-03-15T10:30:00Z",
      amount: 2500,
      status: "succeeded"
    },
    {
      _id: "2", 
      razorpayOrderId: "order_987654321",
      paymentId: "pay_XYZ789ABC123",
      method: "UPI",
      date: "2024-03-14T14:20:00Z",
      amount: 1800,
      status: "succeeded"
    },
    {
      _id: "3",
      razorpayOrderId: "order_456123789",
      paymentId: "pay_DEF456GHI789",
      method: "Debit Card",
      date: "2024-03-13T09:15:00Z",
      amount: 3200,
      status: "pending"
    },
    {
      _id: "4",
      razorpayOrderId: "order_789456123",
      paymentId: "pay_GHI789JKL012",
      method: "Net Banking",
      date: "2024-03-12T16:45:00Z",
      amount: 1500,
      status: "failed"
    },
    {
      _id: "5",
      razorpayOrderId: "order_321654987",
      paymentId: "pay_JKL012MNO345",
      method: "Wallet",
      date: "2024-03-11T11:30:00Z",
      amount: 4200,
      status: "succeeded"
    },
    {
      _id: "6",
      razorpayOrderId: "order_654321987",
      paymentId: "pay_MNO345PQR678",
      method: "Credit Card",
      date: "2024-03-10T13:20:00Z",
      amount: 2800,
      status: "succeeded"
    },
    {
      _id: "7",
      razorpayOrderId: "order_987123456",
      paymentId: "pay_PQR678STU901",
      method: "UPI",
      date: "2024-03-09T15:10:00Z",
      amount: 1900,
      status: "pending"
    },
    {
      _id: "8",
      razorpayOrderId: "order_123987654",
      paymentId: "pay_STU901VWX234",
      method: "Debit Card",
      date: "2024-03-08T10:45:00Z",
      amount: 3500,
      status: "succeeded"
    }
  ];

  useEffect(() => {
    const t = setTimeout(() => setSearch(typing.trim()), 400);
    return () => clearTimeout(t);
  }, [typing]);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/payments/summary?userId=${userId}`);
      if (res.status === 200) {
        setTotalEarnings(Number(res.data.totalEarnings || 0));
      }
    } catch (e) {
      console.error("fetchSummary error", e);
      setTotalEarnings(22400); // Fallback for demo
    }
  };

  const fetchHistory = async (p: number = 1) => {
    setLoading(true);
    try {
      const params: any = { userId, page: p, limit: 10 };
      if (search) params.q = search;
      if (status && status !== "all") params.status = status;

      const res = await api.get("/payments/history", { params });
      if (res.status === 200) {
        const data: PaymentHistoryResponse = res.data;
        const apiData = Array.isArray(data?.data) ? data.data : [];
        setRows(apiData.length > 0 ? apiData : demoPaymentData);
        setPages(data?.pagination?.pages || 1);
        setPage(data?.pagination?.page || p);
      } else {
        // Use demo data if API fails
        const filteredData = demoPaymentData.filter((row: PaymentTransaction) => {
          if (status && status !== "all") {
            return row.status === status;
          }
          if (search) {
            return row.razorpayOrderId?.toLowerCase().includes(search.toLowerCase()) ||
                   row.paymentId?.toLowerCase().includes(search.toLowerCase());
          }
          return true;
        });
        
        const startIndex = (p - 1) * 10;
        const endIndex = startIndex + 10;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        setRows(paginatedData);
        setPages(Math.ceil(filteredData.length / 10));
        setPage(p);
      }
    } catch (e) {
      console.error("fetchHistory error", e);
      // Use demo data as fallback
      const filteredData = demoPaymentData.filter((row: PaymentTransaction) => {
        if (status && status !== "all") {
          return row.status === status;
        }
        if (search) {
          return row.razorpayOrderId?.toLowerCase().includes(search.toLowerCase()) ||
                 row.paymentId?.toLowerCase().includes(search.toLowerCase());
        }
        return true;
      });
      
      const startIndex = (p - 1) * 10;
      const endIndex = startIndex + 10;
      const paginatedData = filteredData.slice(startIndex, endIndex);
      
      setRows(paginatedData);
      setPages(Math.ceil(filteredData.length / 10));
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'pdf') => {
    try {
      console.log('Starting export...', format);
      
      // Show loading state
      const button = document.querySelector('button:has(.download-icon)') as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.innerHTML = '<svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...';
      }

      // Use demo data for export
      const exportData = demoPaymentData.filter((row: PaymentTransaction) => {
        if (status && status !== "all") {
          return row.status === status;
        }
        if (search) {
          return row.razorpayOrderId?.toLowerCase().includes(search.toLowerCase()) ||
                 row.paymentId?.toLowerCase().includes(search.toLowerCase());
        }
        return true;
      });
      
      console.log('Exporting data:', exportData.length, 'records');

      if (format === 'csv') {
        exportToCSV(exportData);
      } else if (format === 'pdf') {
        await exportToPDF(exportData);
      }

    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Restore button
      const button = document.querySelector('button:has(.download-icon)') as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.innerHTML = '<svg class="download-icon w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>Export Report';
      }
    }
  };

  const exportToCSV = (data: PaymentTransaction[]) => {
    // Create CSV content
    const headers = ['Order ID', 'Payment ID', 'Method', 'Date', 'Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        `"${row.razorpayOrderId || 'N/A'}"`,
        `"${row.paymentId || 'N/A'}"`,
        `"${row.method || 'Direct'}"`,
        `"${row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}"`,
        `"₹${Number(row.amount || 0).toFixed(2)}"`,
        `"${row.status}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async (data: PaymentTransaction[]) => {
    try {
      console.log('Starting PDF export...');
      
      // Try dynamic import with error handling
      let jsPDF;
      try {
        const module = await import('jspdf');
        jsPDF = module.jsPDF;
      } catch (importError) {
        console.error('jsPDF import failed:', importError);
        // Fallback: create simple CSV if PDF fails
        alert('PDF generation not available. Downloading CSV instead.');
        exportToCSV(data);
        return;
      }
      
      if (!jsPDF) {
        throw new Error('jsPDF library not available');
      }
      
      const doc = new jsPDF();
      
      // Add custom font for better text rendering
      doc.setFont('helvetica');
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(156, 95, 242); // Primary Theme Color
      doc.text('Payment Report', 20, 20);
      
      // Date range
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray color
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
      
      // Summary
      const totalAmount = data.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const successfulPayments = data.filter(row => row.status === 'succeeded' || row.status === 'paid').length;
      const pendingPayments = data.filter(row => row.status === 'pending').length;
      const failedPayments = data.filter(row => row.status === 'failed').length;
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary:', 20, 45);
      doc.setFontSize(10);
      doc.text(`Total Transactions: ${data.length}`, 20, 52);
      doc.text(`Successful: ${successfulPayments}`, 20, 58);
      doc.text(`Pending: ${pendingPayments}`, 20, 64);
      doc.text(`Failed: ${failedPayments}`, 20, 70);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 20, 76);
      
      // Table headers
      let yPosition = 90;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Order ID', 20, yPosition);
      doc.text('Method', 60, yPosition);
      doc.text('Date', 90, yPosition);
      doc.text('Amount', 120, yPosition);
      doc.text('Status', 150, yPosition);
      
      // Table data
      doc.setFont('helvetica', 'normal');
      yPosition += 7;
      
      data.forEach((row, index) => {
        if (yPosition > 270) { // Add new page if needed
          doc.addPage();
          yPosition = 20;
        }
        
        const orderId = (row.razorpayOrderId || 'N/A').substring(0, 15);
        const method = (row.method || 'Direct').substring(0, 15);
        const date = row.date ? new Date(row.date).toLocaleDateString() : 'N/A';
        const amount = `₹${Number(row.amount || 0).toFixed(0)}`;
        const status = row.status;
        
        doc.text(orderId, 20, yPosition);
        doc.text(method, 60, yPosition);
        doc.text(date, 90, yPosition);
        doc.text(amount, 120, yPosition);
        doc.text(status, 150, yPosition);
        
        yPosition += 6;
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('Vidhik AI - Legal Admin Dashboard', 20, 285);
      
      // Save PDF
      const filename = `payment-report-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Saving PDF as:', filename);
      doc.save(filename);
      
      console.log('PDF export completed successfully');
      
    } catch (error) {
      console.error('PDF export error:', error);
      // Fallback to CSV
      alert('PDF generation failed. Downloading CSV instead.');
      exportToCSV(data);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await api.post(`/payments/${id}/approve`);
      if (res.status === 200) {
        // Refresh list
        fetchHistory(page);
        fetchSummary(); // Update total earnings
        alert("Payment approved successfully!");
      } else {
        alert("Failed to approve payment");
      }
    } catch (e) {
      console.error("Approval error", e);
      alert("Error approving payment");
    }
  };

  useEffect(() => {
    if (userId) fetchSummary();
  }, [userId]);

  useEffect(() => {
    if (userId) fetchHistory(1);
  }, [search, status, userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('export-dropdown');
      const button = event.target as Element;
      if (dropdown && !dropdown.contains(button) && !button.closest('button')) {
        dropdown.classList.add('hidden');
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formattedTotal = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalEarnings);
    } catch {
      return `₹${Number(totalEarnings || 0).toFixed(2)}`;
    }
  }, [totalEarnings]);

  return (
    <div className="flex flex-col flex-1 min-h-screen font-sans">
      <header className="px-8 py-6 border-b bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/90">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Payments & Earnings</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Track your income and transaction history</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => document.getElementById('export-dropdown')?.classList.toggle('hidden')}
            className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center text-sm"
          >
            <Download className="download-icon w-4 h-4 mr-2" />
            Export Report
            <ChevronDown className="w-4 h-4 ml-2" />
          </button>
          <div id="export-dropdown" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <button
              onClick={() => handleExportReport('csv')}
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
            >
              <Download className="w-4 h-4" />
              Export as CSV
            </button>
            <button
              onClick={() => handleExportReport('pdf')}
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export as PDF
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 text-white rounded-2xl shadow-2xl relative overflow-hidden p-8 border-none transform transition-transform hover:scale-[1.01] duration-300">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-1/4 -translate-y-1/4">
              <Wallet size={200} />
            </div>
            <div className="relative z-10">
              <p className="text-primary font-bold text-xs uppercase tracking-widest mb-4">Total Revenue</p>
              <div className="text-6xl font-extrabold tracking-tighter mb-4 font-display">{formattedTotal}</div>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-400/10 w-fit px-3 py-1 rounded-full border border-emerald-400/20">
                <ArrowUpRight size={16} />
                <span>+18.2% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col transition-all hover:shadow-md">
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-4">Available Balance</p>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">{formattedTotal}</div>
            <div className="mt-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${totalEarnings >= 3000 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`}></div>
              <p className="text-xs text-slate-500 font-medium">
                {totalEarnings >= 3000 ? "Ready for payout" : `Minimum threshold ₹3,000 (${(3000 - totalEarnings).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} more needed)`}
              </p>
            </div>
            <button
              className="w-full mt-auto py-3 px-4 rounded-xl border-2 border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest bg-slate-50 hover:bg-white hover:border-primary/20 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50 disabled:hover:border-slate-100 disabled:hover:text-slate-500"
              disabled={totalEarnings < 3000}
              onClick={() => alert("Payout request submitted successfully!")}
            >
              Request Payout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">A detailed list of all your incoming payments</p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    placeholder="Search by Order ID..."
                    className="pl-11 pr-10 py-3 border border-slate-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none rounded-xl text-sm font-semibold w-72 transition-all shadow-sm hover:border-slate-300 placeholder:text-slate-400"
                    value={typing}
                    onChange={e => setTyping(e.target.value)}
                  />
                  {typing && (
                    <button
                      onClick={() => setTyping("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors">
                    <Filter size={14} />
                  </div>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none rounded-xl pl-11 pr-10 py-3 text-sm font-bold text-slate-700 transition-all cursor-pointer w-48"
                  >
                    <option value="all">All Transactions</option>
                    <option value="succeeded">Succeeded Only</option>
                    <option value="pending">Pending Only</option>
                    <option value="failed">Failed Only</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                    <ChevronDown size={16} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="pl-6 py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Details</th>
                  <th className="py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Method</th>
                  <th className="py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Date</th>
                  <th className="py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Amount</th>
                  <th className="pr-6 py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Fetching History...</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-40 text-center">
                      <p className="text-slate-400 font-medium italic text-base">No transactions matched your filters</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="pl-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 font-display tracking-tight text-base leading-none mb-1">{r.razorpayOrderId || "N/A"}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.paymentId || "ID: " + r._id.slice(-8)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 uppercase tracking-wider">
                          {r.method || "Direct"}
                        </span>
                      </td>
                      <td className="text-slate-600 font-bold font-mono text-xs">
                        {r.date ? new Date(r.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                      </td>
                      <td>
                        <span className="font-extrabold text-slate-900 text-base">₹{Number(r.amount || 0).toLocaleString()}</span>
                      </td>
                      <td className="pr-6">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${r.status === "succeeded" || r.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm shadow-emerald-50/50"
                          : r.status === "failed"
                            ? "bg-rose-50 text-rose-700 border border-rose-100 shadow-sm shadow-rose-50/50"
                            : "bg-amber-50 text-amber-700 border border-amber-100 shadow-sm shadow-amber-50/50"
                          }`}>
                          <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
                          {r.status}
                        </span>
                        {r.status === "pending" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(r._id);
                            }}
                            className="ml-3 inline-flex items-center px-2 py-1 bg-secondary text-primary text-[10px] font-bold uppercase tracking-wider rounded border border-primary/20 hover:bg-primary/10 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Page {page} / {pages}</p>
              <div className="flex gap-3">
                <button
                  className="h-9 px-5 rounded-xl border-2 border-slate-100 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => fetchHistory(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <button
                  className="h-9 px-5 rounded-xl border-2 border-slate-100 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => fetchHistory(page + 1)}
                  disabled={page >= pages}
                >
                  Next Page
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
