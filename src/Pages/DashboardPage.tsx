import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { DollarSign, Calendar, Clock, TrendingUp, Search, Bell, FileText, LifeBuoy, Plus, ArrowRight, ExternalLink, ArrowUpRight, PenTool, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Components/ui/card";
import { Badge } from "../Components/ui/badge";
import { Button } from "../Components/ui/button";

interface Stats {
  totalEarnings: number;
  upcomingConsultations: number;
  publishedBlogs: number;
  draftBlogs: number;
  openTickets: number;
  closedTickets: number;
  urgentTickets: number;
  monthlyEarnings: number;
  lastMonthEarnings: number;
}

interface MonthlyRevenue {
  month: string;
  earnings: number;
  consultations: number;
}

interface ServiceMix {
  serviceType: string;
  revenue: number;
}

interface Transaction {
  id: string;
  date: string;
  client: string;
  service: string;
  amount: number;
  status: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    upcomingConsultations: 0,
    publishedBlogs: 0,
    draftBlogs: 0,
    openTickets: 0,
    closedTickets: 0,
    urgentTickets: 0,
    monthlyEarnings: 0,
    lastMonthEarnings: 0,
  });

  // Calculate trend
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueTrendValue = calculateTrend(stats.monthlyEarnings, stats.lastMonthEarnings);
  const revenueTrendDirection = revenueTrendValue > 0 ? 'up' : revenueTrendValue < 0 ? 'down' : 'neutral';
  const revenueTrendText = `${Math.abs(revenueTrendValue).toFixed(1)}% from last month`;

  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [serviceDistribution, setServiceDistribution] = useState<ServiceMix[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [profile, setProfile] = useState<{ fullName: string; title: string; avatar?: string } | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        // Demo profile data for testing
        const demoProfile = {
          fullName: "Admin User",
          title: "Legal Administrator",
          avatar: "/favicon.svg"
        };

        const [statsRes, revenueRes, servicesRes, txRes, profileRes, paymentSummaryRes] = await Promise.all([
          api.get("/dashboard/stats").catch(() => ({ data: null })),
          api.get("/dashboard/revenue").catch(() => ({ data: null })),
          api.get("/dashboard/services").catch(() => ({ data: null })),
          api.get("/dashboard/transactions").catch(() => ({ data: null })),
          api.get(`/profile/${user?.userId}`).catch(() => ({ data: demoProfile })),
          api.get("/payments/summary").catch(() => ({ data: null })),
        ]);

        const s = statsRes.data?.stats || {};
        const p = paymentSummaryRes.data || {};

        // Use demo data if API fails
        setStats({
          totalEarnings: p.totalEarnings || 22400,
          upcomingConsultations: s.upcomingConsultations || 12,
          publishedBlogs: s.publishedBlogs || 24,
          draftBlogs: s.draftBlogs || 8,
          openTickets: s.openTickets || 5,
          closedTickets: s.closedTickets || 47,
          urgentTickets: s.urgentTickets || 2,
          monthlyEarnings: p.monthlyEarnings || 8500,
          lastMonthEarnings: p.lastMonthEarnings || 7200,
        });

        // Demo revenue data
        setMonthlyRevenue(revenueRes.data?.monthlyRevenue || [
          { month: "Jan", earnings: 6500, consultations: 15 },
          { month: "Feb", earnings: 7200, consultations: 18 },
          { month: "Mar", earnings: 8500, consultations: 22 },
          { month: "Apr", earnings: 7800, consultations: 19 },
          { month: "May", earnings: 9200, consultations: 25 },
          { month: "Jun", earnings: 8900, consultations: 21 },
        ]);

        // Demo service distribution
        setServiceDistribution(servicesRes.data?.serviceDistribution || [
          { serviceType: "Legal Consultation", revenue: 15000 },
          { serviceType: "Document Review", revenue: 8500 },
          { serviceType: "Case Management", revenue: 12000 },
          { serviceType: "Court Filing", revenue: 6800 },
          { serviceType: "Legal Research", revenue: 4500 },
        ]);

        // Always set profile data (demo or API)
        if (profileRes.data) {
          setProfile(profileRes.data);
        } else {
          setProfile(demoProfile);
        }

        // Demo transactions
        const recent = txRes.data?.recentTransactions || [
          { _id: "1", date: new Date().toISOString(), clientName: "John Smith", serviceType: "Legal Consultation", amount: 2500, status: "completed" },
          { _id: "2", date: new Date(Date.now() - 86400000).toISOString(), clientName: "Sarah Johnson", serviceType: "Document Review", amount: 1800, status: "completed" },
          { _id: "3", date: new Date(Date.now() - 172800000).toISOString(), clientName: "Mike Davis", serviceType: "Case Management", amount: 3200, status: "pending" },
          { _id: "4", date: new Date(Date.now() - 259200000).toISOString(), clientName: "Emily Brown", serviceType: "Court Filing", amount: 1500, status: "completed" },
          { _id: "5", date: new Date(Date.now() - 345600000).toISOString(), clientName: "Robert Wilson", serviceType: "Legal Research", amount: 4200, status: "in-progress" },
        ];
        
        setTransactions(
          recent.map((t: any) => ({
            id: t._id,
            date: new Date(t.date).toLocaleDateString(),
            client: t.clientName,
            service: t.serviceType,
            amount: t.amount,
            status: t.status,
          }))
        );
      } catch (err) {
        console.error("Dashboard load error:", err);
        // Set demo data on error
        setProfile({
          fullName: "Admin User",
          title: "Legal Administrator",
          avatar: "/favicon.svg"
        });
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const COLORS = useMemo(
    () => ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#64748b"],
    []
  );

  const barData = useMemo(
    () =>
      (monthlyRevenue || []).map((m) => ({
        month: (m?.month?.slice?.(0, 7) || m?.month || "").replace("-", "/"),
        earnings: Number(m?.earnings || 0),
        consultations: Number(m?.consultations || 0),
      })),
    [monthlyRevenue]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-purple-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <div className="h-4 w-4 rounded-full bg-white"></div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search dashboard..."
                className="w-64 rounded-lg border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-4 text-sm transition-all focus:border-primary/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{user?.fullName || profile?.fullName || "Legal Admin"}</p>
                  <p className="text-xs text-gray-500">{user?.email || profile?.title || "Superuser"}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/90 to-primary p-0.5 shadow-md shadow-primary/10">
                  <div className="h-full w-full rounded-full bg-white p-0.5">
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center text-white text-xs font-bold">
                      {profile?.avatar ? (
                        <img src={profile.avatar.startsWith('http') ? profile.avatar : `${api.defaults.baseURL?.replace('/api', '')}${profile.avatar}`} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        user?.fullName?.charAt(0).toUpperCase() || "LA"
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 lg:px-8 space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="group cursor-pointer border-0 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-lg hover:bg-white transition-all duration-300" onClick={() => navigate('/bookings')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Bookings</h3>
                  <p className="text-sm text-gray-500">Manage Schedule</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-primary/10">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer border-0 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-lg hover:bg-white transition-all duration-300" onClick={() => navigate('/blogs/create')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">New Post</h3>
                  <p className="text-sm text-gray-500">Write Article</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer border-0 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-lg hover:bg-white transition-all duration-300" onClick={() => navigate('/support')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Support</h3>
                  <p className="text-sm text-gray-500">View Tickets</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <LifeBuoy className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer border-0 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-lg hover:bg-white transition-all duration-300" onClick={() => navigate('/payments')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Finance</h3>
                  <p className="text-sm text-gray-500">Check Payouts</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">₹{stats.totalEarnings.toLocaleString()}</p>
                  <div className="flex items-center gap-1">
                    {revenueTrendDirection === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                    {revenueTrendDirection === 'down' && <span className="text-rose-600">↓</span>}
                    <p className={`text-sm font-medium ${revenueTrendDirection === 'up' ? 'text-emerald-600' : revenueTrendDirection === 'down' ? 'text-rose-600' : 'text-gray-500'}`}>
                      {revenueTrendText}
                    </p>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Pending Bookings</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.upcomingConsultations}</p>
                  <p className="text-sm font-medium text-gray-500">Awaiting confirmation</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Published Content</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.publishedBlogs}</p>
                  <p className="text-sm font-medium text-gray-500">{stats.draftBlogs} drafts in progress</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Ticket Status</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.openTickets}/{stats.closedTickets}</p>
                  <p className="text-sm font-medium text-gray-500">{stats.urgentTickets} urgent priority</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <LifeBuoy className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Overview */}
          <Card className="lg:col-span-3 border-0 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Revenue Analytics</CardTitle>
                  <CardDescription className="text-sm text-gray-500 mt-1">Income vs Consultations over time</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  View Report <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[350px] w-full">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        formatter={(value: number) => [`₹${value}`, '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                      <Bar
                        dataKey="earnings"
                        name="Revenue"
                        fill="url(#colorRevenue)"
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(267, 85%, 60%)" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="hsl(267, 85%, 60%)" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-semibold text-sm">No performance data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Table */}
        <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Transactions</CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-1">Latest financial activities</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                View All History
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="pl-6 py-4 text-left font-semibold text-gray-900 uppercase tracking-tight text-[11px]">Client Name</th>
                    <th className="py-4 text-left font-semibold text-gray-900 uppercase tracking-tight text-[11px]">Service</th>
                    <th className="py-4 text-left font-semibold text-gray-900 uppercase tracking-tight text-[11px]">Date</th>
                    <th className="py-4 text-left font-semibold text-gray-900 uppercase tracking-tight text-[11px]">Amount</th>
                    <th className="pr-6 py-4 text-left font-semibold text-gray-900 uppercase tracking-tight text-[11px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="h-40 text-center text-gray-400 font-medium italic">
                        No transactions recorded yet
                      </td>
                    </tr>
                  ) : (
                    transactions.slice(0, 5).map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                        <td className="pl-6 py-5">
                          <div className="font-semibold text-gray-900">{tx.client}</div>
                          <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">ID: {tx.id.slice(-6)}</div>
                        </td>
                        <td className="py-5">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                            {tx.service}
                          </Badge>
                        </td>
                        <td className="py-5 text-gray-500 font-semibold font-mono text-xs">{tx.date}</td>
                        <td className="py-5 font-extrabold text-gray-900">₹{tx.amount.toLocaleString()}</td>
                        <td className="pr-6 py-5">
                          <Badge 
                            variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "outline"}
                            className={`${
                              tx.status === "completed"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                                : tx.status === "pending"
                                  ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                tx.status === "completed" ? "bg-emerald-600" : 
                                tx.status === "pending" ? "bg-amber-600" : "bg-gray-500"
                              }`}></span>
                              {tx.status}
                            </span>
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
