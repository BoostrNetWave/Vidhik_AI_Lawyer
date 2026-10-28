import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Briefcase, 
    PlusCircle, 
    Search, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Upload, 
    ArrowRight, 
    User, 
    Coins, 
    Trash2, 
    FileText, 
    ExternalLink,
    Percent,
    Video,
    Download,
    Sparkles,
    Send,
    Check,
    ChevronRight,
    Globe,
    Layers
} from "lucide-react";
import { caseService, ICase, IMilestone } from "../services/caseService";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmationContext";
import { useAuth } from "../context/AuthContext";
import { getFileUrl, isImageFile, isPdfFile } from "../lib/fileUtils";

export default function CasesPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { user } = useAuth();
    const lawyerId = user?.id || (user as any)?._id || user?.userId;

    // View tab: 'my_cases' or 'open_marketplace'
    const [activeTab, setActiveTab] = useState<'my_cases' | 'open_marketplace'>('my_cases');
    
    const [myCases, setMyCases] = useState<ICase[]>([]);
    const [openCases, setOpenCases] = useState<ICase[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedCase, setSelectedCase] = useState<ICase | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Create Case Form Modal (for direct client engagement)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        clientEmail: "",
        title: "",
        description: "",
        totalFee: ""
    });
    const [isSubmittingCase, setIsSubmittingCase] = useState(false);

    // Apply / Express Interest Modal
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [targetOpenCase, setTargetOpenCase] = useState<ICase | null>(null);
    const [proposalData, setProposalData] = useState({
        proposedFee: "",
        estimatedTimeline: "2-3 Weeks",
        proposalNote: ""
    });
    const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

    // Summary upload in CasesPage
    const [summaryFile, setSummaryFile] = useState<File | null>(null);
    const [isUploadingSummary, setIsUploadingSummary] = useState(false);

    // Plan Builder
    const [builderMilestones, setBuilderMilestones] = useState<{
        title: string;
        description: string;
        progressIncrement: number;
        payoutAmount: number;
    }[]>([
        { title: "Initial Case Assessment", description: "Reviewing documents and outline primary legal options", progressIncrement: 20, payoutAmount: 0 },
        { title: "Document Drafting", description: "Drafting the legal paperwork and petitions", progressIncrement: 40, payoutAmount: 0 },
        { title: "Filing and Hearings", description: "Filing petition in court and attending initial hearings", progressIncrement: 40, payoutAmount: 0 }
    ]);

    // Proof Upload loading state
    const [uploadingMilestoneIndex, setUploadingMilestoneIndex] = useState<number | null>(null);
    const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadDetails, setUploadDetails] = useState<string>("");

    const fetchAllCases = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [myCasesData, openCasesData] = await Promise.all([
                caseService.getCases().catch(() => []),
                caseService.getOpenCases().catch(() => [])
            ]);

            setMyCases(myCasesData);
            setOpenCases(openCasesData);

            setSelectedCase(prevSelected => {
                if (!prevSelected) {
                    if (activeTab === 'open_marketplace') {
                        return openCasesData.length > 0 ? openCasesData[0] : null;
                    }
                    return myCasesData.length > 0 ? myCasesData[0] : null;
                }
                const pool = activeTab === 'open_marketplace' ? openCasesData : myCasesData;
                const updated = pool.find((c: any) => c._id === prevSelected._id);
                return updated || prevSelected;
            });
        } catch (err: any) {
            console.error(err);
            if (!isSilent) {
                error(err.response?.data?.message || "Failed to load cases");
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [error, activeTab]);

    useEffect(() => {
        fetchAllCases();
        const interval = setInterval(() => {
            fetchAllCases(true);
        }, 4000);
        return () => clearInterval(interval);
    }, [fetchAllCases]);

    // Switch tabs and default selection
    const handleTabChange = (tab: 'my_cases' | 'open_marketplace') => {
        setActiveTab(tab);
        const pool = tab === 'open_marketplace' ? openCases : myCases;
        setSelectedCase(pool.length > 0 ? pool[0] : null);
    };

    // Open Apply Modal
    const handleOpenApplyModal = (c: ICase) => {
        setTargetOpenCase(c);
        setProposalData({
            proposedFee: (c.budget || c.totalFee || 2500).toString(),
            estimatedTimeline: "2-3 Weeks",
            proposalNote: `I have reviewed the case details for "${c.title}" and would be pleased to provide comprehensive legal representation.`
        });
        setIsApplyModalOpen(true);
    };

    // Submit Proposal / Approval to take case
    const handleApplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetOpenCase) return;

        setIsSubmittingProposal(true);
        try {
            await caseService.applyToCase(targetOpenCase._id, {
                proposedFee: Number(proposalData.proposedFee) || targetOpenCase.budget || targetOpenCase.totalFee,
                estimatedTimeline: proposalData.estimatedTimeline,
                proposalNote: proposalData.proposalNote
            });
            success("Approval submitted! Client will see your proposal and can select you.");
            setIsApplyModalOpen(false);
            setTargetOpenCase(null);
            fetchAllCases(true);
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to submit proposal");
        } finally {
            setIsSubmittingProposal(false);
        }
    };

    // Confirm acceptance when selected by client
    const handleConfirmBooking = async (caseId?: string) => {
        const targetId = caseId || selectedCase?._id;
        if (!targetId) return;

        confirm({
            title: "Accept Engagement Request",
            message: "Accept this case engagement and prompt the client to complete payment. Proceed?",
            type: "info",
            confirmText: "Accept Engagement",
            onConfirm: async () => {
                try {
                    const updated = await caseService.confirmBooking(targetId);
                    success("Case accepted! Client has been notified to complete payment.");
                    fetchAllCases(true);
                    setSelectedCase(updated);
                } catch (err: any) {
                    error(err.response?.data?.message || "Failed to confirm engagement");
                }
            }
        });
    };

    // Meeting summary upload
    const handleUploadSummaryDirect = async () => {
        if (!summaryFile || !selectedCase) return;
        setIsUploadingSummary(true);
        try {
            const updated = await caseService.uploadMeetingSummary(selectedCase._id, summaryFile);
            success("Meeting summary uploaded successfully! Action roadmap unlocked.");
            setSummaryFile(null);
            fetchAllCases(true);
            setSelectedCase(updated);
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to upload summary");
        } finally {
            setIsUploadingSummary(false);
        }
    };

    // Roadmap builder
    const handleAddBuilderMilestone = () => {
        setBuilderMilestones([
            ...builderMilestones,
            { title: "", description: "", progressIncrement: 0, payoutAmount: 0 }
        ]);
    };

    const handleRemoveBuilderMilestone = (index: number) => {
        setBuilderMilestones(builderMilestones.filter((_, i) => i !== index));
    };

    const handleMilestoneChange = (index: number, field: string, value: any) => {
        const updated = [...builderMilestones];
        updated[index] = { ...updated[index], [field]: value };
        setBuilderMilestones(updated);
    };

    const handleSubmitPlan = async () => {
        if (!selectedCase) return;
        const totalInc = builderMilestones.reduce((acc, curr) => acc + Number(curr.progressIncrement), 0);
        if (totalInc !== 100) {
            error(`Total progress increment must equal 100%. Currently: ${totalInc}%`);
            return;
        }

        try {
            const updated = await caseService.submitPlan(selectedCase._id, builderMilestones);
            success("Action roadmap submitted to client for review!");
            fetchAllCases(true);
            setSelectedCase(updated);
        } catch (err: any) {
            error(err.response?.data?.message || "Failed to submit plan");
        }
    };

    const handleUpdateMilestoneStatus = async (index: number, status: string) => {
        if (!selectedCase) return;
        try {
            const updated = await caseService.updateMilestoneStatus(selectedCase._id, index, status);
            success("Milestone status updated!");
            fetchAllCases(true);
            setSelectedCase(updated);
        } catch (err: any) {
            error(err.response?.data?.message || "Failed to update milestone status");
        }
    };

    const handleUploadProof = async (index: number) => {
        if (!uploadFile || !selectedCase) return;
        setUploadingMilestoneIndex(index);
        try {
            const updated = await caseService.uploadProof(selectedCase._id, index, uploadFile, uploadDetails);
            success("Proof document uploaded successfully!");
            setUploadFile(null);
            setUploadDetails("");
            setActiveUploadIndex(null);
            fetchAllCases(true);
            setSelectedCase(updated);
        } catch (err: any) {
            error(err.response?.data?.message || "Failed to upload proof");
        } finally {
            setUploadingMilestoneIndex(null);
        }
    };

    const handleRequestPayout = async (index: number) => {
        if (!selectedCase) return;
        confirm({
            title: "Request Payout",
            message: "Request milestone payment release from the Super Admin. Ensure proof documents are uploaded.",
            type: "info",
            confirmText: "Request Payout",
            onConfirm: async () => {
                try {
                    await caseService.requestPayout(selectedCase._id, index);
                    success("Payout request submitted to Super Admin!");
                    fetchAllCases(true);
                } catch (err: any) {
                    error(err.response?.data?.message || "Failed to request payout");
                }
            }
        });
    };

    const currentCasesPool = activeTab === 'open_marketplace' ? openCases : myCases;
    const filteredCases = currentCasesPool.filter(c => 
        (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.client?.fullName || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 bg-primary rounded-2xl text-white shadow-md shadow-primary/20">
                            <Briefcase size={22} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Case Management & Marketplace</h1>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Browse open cases posted by clients, express approval & interest, and manage active action roadmaps.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/60 shadow-inner">
                    <button
                        onClick={() => handleTabChange('my_cases')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'my_cases'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Layers size={15} />
                        <span>My Assigned Cases</span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {myCases.length}
                        </span>
                    </button>

                    <button
                        onClick={() => handleTabChange('open_marketplace')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'open_marketplace'
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Globe size={15} />
                        <span>Available Open Cases</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            activeTab === 'open_marketplace' ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        }`}>
                            {openCases.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Cases List (4 Cols) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-slate-900 text-lg">
                            {activeTab === 'open_marketplace' ? "Open Marketplace Cases" : "My Engagements"}
                        </h3>
                        <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                            {filteredCases.length} Total
                        </span>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search cases or client names..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-inner"
                        />
                    </div>

                    {loading && currentCasesPool.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-2 text-xs text-slate-400 font-bold">Syncing cases...</p>
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-6">
                            <Briefcase size={36} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-sm text-slate-700">No cases found</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {activeTab === 'open_marketplace' 
                                    ? "No open marketplace cases currently available." 
                                    : "You have no assigned cases yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                            {filteredCases.map((c) => {
                                const hasApplied = c.interestedLawyers?.some(
                                    (i: any) => (i.lawyer?._id || i.lawyer)?.toString() === lawyerId?.toString()
                                );
                                const isSelectedForMe = c.status === 'pending_lawyer' && (c.lawyer?._id || c.lawyer)?.toString() === lawyerId?.toString();

                                return (
                                    <div
                                        key={c._id}
                                        onClick={() => setSelectedCase(c)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                            selectedCase?._id === c._id
                                                ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                                : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-xs"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                                                {c.title}
                                            </h4>
                                        </div>

                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2 font-medium">
                                            {c.aiSummary || c.description}
                                        </p>

                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-2 border-t border-slate-50">
                                            <div className="flex items-center gap-1.5 text-slate-700">
                                                <User size={13} className="text-slate-400" />
                                                <span className="truncate max-w-[120px]">{c.client?.fullName || "Client"}</span>
                                            </div>
                                            <span className="text-slate-900 font-black">
                                                ₹{(c.totalFee || c.budget || 0).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                c.status === "open"
                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                    : c.status === "pending_lawyer"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : c.status === "pending_payment"
                                                            ? "bg-orange-100 text-orange-800"
                                                            : c.status === "active"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-slate-100 text-slate-700"
                                            }`}>
                                                {c.status === "open" 
                                                    ? (hasApplied ? "✓ You Applied" : "Open for Approval") 
                                                    : c.status === "pending_lawyer" 
                                                        ? (isSelectedForMe ? "Action: Client Picked You" : "Pending Confirmation")
                                                        : c.status === "pending_payment" 
                                                            ? "Awaiting Payment" 
                                                            : c.status}
                                            </span>

                                            {c.documents && c.documents.length > 0 && (
                                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                    <FileText size={11} /> {c.documents.length} doc{c.documents.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Side: Case Detail View (8 Cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {selectedCase ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
                            
                            {/* Case Header */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 pb-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">
                                            {selectedCase.category || "General Legal"}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">Ref: {selectedCase.filingNumber || selectedCase._id}</span>
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight mt-1">
                                        {selectedCase.title}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Client: <span className="font-bold text-slate-700">{selectedCase.client?.fullName}</span> • {selectedCase.client?.location || "India"}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 bg-slate-50 border border-slate-200/60 rounded-2xl px-5 py-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Case Status</p>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                                            selectedCase.status === 'open' 
                                                ? 'bg-blue-100 text-blue-800'
                                                : selectedCase.status === 'pending_lawyer'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : selectedCase.status === 'pending_payment'
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : selectedCase.status === 'active'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-slate-100 text-slate-800'
                                        }`}>
                                            {selectedCase.status === 'open' ? 'Open Marketplace' : selectedCase.status}
                                        </span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200" />
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Budget / Fee</p>
                                        <p className="text-base font-black text-primary mt-0.5">
                                            ₹{(selectedCase.totalFee || selectedCase.budget || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* AI EXECUTIVE SUMMARY & KEY ISSUES CARD */}
                            {selectedCase.aiSummary && (
                                <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border border-primary/20 rounded-2xl p-6 space-y-4 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-slate-900 text-sm">Vidhik AI Case Intelligence Summary</h4>
                                                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Automated Legal Assessment for Advocates</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                            AI Analysis
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-white/70 border border-slate-150 rounded-xl p-4">
                                        {selectedCase.aiSummary}
                                    </p>

                                    {selectedCase.aiKeyFacts && selectedCase.aiKeyFacts.length > 0 && (
                                        <div className="space-y-2 pt-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Key Facts & Disputed Points</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {selectedCase.aiKeyFacts.map((fact, idx) => (
                                                    <div key={idx} className="bg-white/90 border border-slate-150 rounded-lg p-2.5 flex items-start gap-2 text-xs font-semibold text-slate-800">
                                                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                        <span>{fact}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ATTACHED CASE DOCUMENTS (PDF / WORD) */}
                            {selectedCase.documents && selectedCase.documents.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        Uploaded Case Documentation ({selectedCase.documents.length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedCase.documents.map((doc, idx) => (
                                            <a 
                                                key={idx}
                                                href={getFileUrl(doc.url)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between group transition-all"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                                                            {doc.name}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 font-semibold">{doc.docType || "Supporting Document"}</span>
                                                    </div>
                                                </div>
                                                <Download className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0 ml-2" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* OPEN CASE APPROVAL / APPLICATION ACTION BANNER */}
                            {selectedCase.status === 'open' && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-extrabold text-slate-900 text-base">
                                                Interested in representing this case?
                                            </h4>
                                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                                                Review the brief and documents above. Click approve to express interest and propose your terms.
                                            </p>
                                        </div>

                                        {selectedCase.interestedLawyers?.some((i: any) => (i.lawyer?._id || i.lawyer)?.toString() === lawyerId?.toString()) ? (
                                            <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl px-4 py-2.5 font-bold text-xs flex items-center gap-2">
                                                <CheckCircle2 size={16} />
                                                <span>You Approved this Case (Awaiting Client Selection)</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenApplyModal(selectedCase)}
                                                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 shrink-0 transition-all active:scale-95"
                                            >
                                                <CheckCircle2 size={16} />
                                                <span>Approve & Apply for Case</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CLIENT SELECTED THIS LAWYER BANNER */}
                            {selectedCase.status === 'pending_lawyer' && (
                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl space-y-4">
                                    <div className="flex items-start gap-4">
                                        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                        <div className="space-y-1">
                                            <h4 className="font-extrabold text-amber-950 text-sm">Client Selected Your Proposal!</h4>
                                            <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                                                Client <strong>{selectedCase.client?.fullName}</strong> has confirmed selection of your legal representation for <strong>"{selectedCase.title}"</strong>. Click accept below to prompt the client for payment and initiate the engagement roadmap.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handleConfirmBooking(selectedCase._id)}
                                            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
                                        >
                                            <CheckCircle2 size={16} />
                                            <span>Accept & Prompt Client Payment</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* AWAITING PAYMENT BANNER */}
                            {selectedCase.status === 'pending_payment' && (
                                <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl flex items-center gap-4">
                                    <Clock className="h-6 w-6 text-orange-600 shrink-0" />
                                    <div>
                                        <h4 className="font-extrabold text-orange-950 text-sm">Engagement Accepted — Awaiting Client Payment</h4>
                                        <p className="text-xs text-orange-800 font-medium mt-0.5">
                                            The client has been notified to complete the retainer fee payment (₹{selectedCase.totalFee.toLocaleString()}). As soon as paid, the case will automatically activate.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ACTIVE CASE - VIDEO CONSULTATION & ACTION ROADMAP BUILDER */}
                            {selectedCase.status === 'active' && (
                                <div className="space-y-8">
                                    {/* Video consultation link */}
                                    {selectedCase.meetingLink && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                                    <Video size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-extrabold text-emerald-950 text-sm">Case Video Consultation Room</h4>
                                                    <p className="text-xs text-emerald-700 font-medium">Connect directly with client via the live video suite.</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => navigate(`/cases/${selectedCase._id}/consultation`)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-10 px-5 flex items-center gap-2 shrink-0 shadow-xs"
                                            >
                                                <Video size={16} />
                                                <span>Join Video Suite</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* ROADMAP SECTION */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-extrabold text-slate-900 text-lg">Action Roadmap & Milestone Progress</h3>
                                                <p className="text-xs text-slate-500 font-semibold">Breakdown of legal phases with proof-of-work documentation.</p>
                                            </div>
                                            <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">
                                                {selectedCase.currentProgress}% Completed
                                            </span>
                                        </div>

                                        {selectedCase.planSubmitted ? (
                                            /* Render existing submitted milestones */
                                            <div className="space-y-4">
                                                {selectedCase.milestones.map((m, mIdx) => (
                                                    <div key={mIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                                                                    {mIdx + 1}
                                                                </span>
                                                                <h5 className="font-extrabold text-slate-900 text-sm">{m.title}</h5>
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                                                m.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                                            }`}>
                                                                {m.status}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs text-slate-600 pl-8 font-medium">{m.description}</p>

                                                        {/* Proof Docs */}
                                                        {m.proofDocs && m.proofDocs.length > 0 && (
                                                            <div className="pl-8 flex flex-wrap gap-2 pt-1">
                                                                {m.proofDocs.map((doc, dIdx) => (
                                                                    <a 
                                                                        key={dIdx} 
                                                                        href={getFileUrl(doc.url)} 
                                                                        target="_blank" 
                                                                        rel="noreferrer"
                                                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-800 flex items-center gap-1.5"
                                                                    >
                                                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                                                        <span>{doc.name}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Actions: Mark status, upload proof, request payout */}
                                                        <div className="pl-8 pt-2 flex flex-wrap items-center gap-2">
                                                            {m.status !== 'completed' && (
                                                                <button
                                                                    onClick={() => handleUpdateMilestoneStatus(mIdx, 'completed')}
                                                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                                                                >
                                                                    Mark Completed
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => setActiveUploadIndex(activeUploadIndex === mIdx ? null : mIdx)}
                                                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1"
                                                            >
                                                                <Upload size={13} />
                                                                <span>Upload Proof</span>
                                                            </button>

                                                            {m.status === 'completed' && m.payoutStatus !== 'approved' && (
                                                                <button
                                                                    disabled={m.payoutStatus === 'requested'}
                                                                    onClick={() => handleRequestPayout(mIdx)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                                        m.payoutStatus === 'requested'
                                                                            ? "bg-amber-100 text-amber-800 cursor-not-allowed"
                                                                            : "bg-primary text-white hover:bg-primary/90"
                                                                    }`}
                                                                >
                                                                    {m.payoutStatus === 'requested' ? "Payout Requested" : "Request Payout"}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Inline Proof Upload Drawer */}
                                                        {activeUploadIndex === mIdx && (
                                                            <div className="pl-8 pt-2 space-y-2 bg-white border border-slate-200 rounded-xl p-4 mt-2">
                                                                <input
                                                                    type="file"
                                                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                                    className="text-xs"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Proof notes / court order number..."
                                                                    value={uploadDetails}
                                                                    onChange={(e) => setUploadDetails(e.target.value)}
                                                                    className="w-full h-8 px-2 border rounded text-xs"
                                                                />
                                                                <button
                                                                    disabled={!uploadFile || uploadingMilestoneIndex === mIdx}
                                                                    onClick={() => handleUploadProof(mIdx)}
                                                                    className="px-4 py-1.5 bg-primary text-white rounded text-xs font-bold disabled:opacity-50"
                                                                >
                                                                    {uploadingMilestoneIndex === mIdx ? "Uploading..." : "Save Proof"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* BUILD INITIAL ACTION ROADMAP */
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                                                <h4 className="font-extrabold text-slate-900 text-sm">Define Case Action Roadmap</h4>
                                                <p className="text-xs text-slate-500">
                                                    Break down the legal workflow into milestones (must total 100% progress).
                                                </p>

                                                <div className="space-y-3">
                                                    {builderMilestones.map((bm, bIdx) => (
                                                        <div key={bIdx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                                <div className="sm:col-span-8">
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Milestone ${bIdx + 1} Title`}
                                                                        value={bm.title}
                                                                        onChange={(e) => handleMilestoneChange(bIdx, 'title', e.target.value)}
                                                                        className="w-full h-9 border rounded-lg px-3 text-xs font-bold"
                                                                    />
                                                                </div>
                                                                <div className="sm:col-span-3">
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Progress %"
                                                                        value={bm.progressIncrement}
                                                                        onChange={(e) => handleMilestoneChange(bIdx, 'progressIncrement', Number(e.target.value))}
                                                                        className="w-full h-9 border rounded-lg px-3 text-xs font-bold"
                                                                    />
                                                                </div>
                                                                <div className="sm:col-span-1 flex items-center justify-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveBuilderMilestone(bIdx)}
                                                                        className="text-slate-400 hover:text-red-500"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <input
                                                                type="text"
                                                                placeholder="Description / deliverables..."
                                                                value={bm.description}
                                                                onChange={(e) => handleMilestoneChange(bIdx, 'description', e.target.value)}
                                                                className="w-full h-8 border rounded-lg px-3 text-xs"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddBuilderMilestone}
                                                        className="px-4 py-2 border rounded-xl font-bold text-xs hover:bg-white"
                                                    >
                                                        + Add Phase
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={handleSubmitPlan}
                                                        className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs shadow-sm hover:bg-primary/90"
                                                    >
                                                        Submit Roadmap for Client Approval
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400">
                            <Briefcase size={40} className="mx-auto mb-3 text-slate-300" />
                            <h3 className="font-bold text-slate-800 text-base">Select a case to view</h3>
                            <p className="text-xs text-slate-400 mt-1">Pick a case from the list on the left to view documentation, AI analysis, and take action.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* APPLY / EXPRESS INTEREST MODAL */}
            {isApplyModalOpen && targetOpenCase && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Approve & Apply to Case</h3>
                                <p className="text-xs text-slate-500 font-semibold truncate max-w-xs">{targetOpenCase.title}</p>
                            </div>
                            <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                                <Trash2 size={18} className="hidden" />
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleApplySubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Proposed Fee (₹)</label>
                                <input
                                    type="number"
                                    required
                                    value={proposalData.proposedFee}
                                    onChange={(e) => setProposalData({ ...proposalData, proposedFee: e.target.value })}
                                    className="w-full h-11 border rounded-xl px-4 text-sm font-semibold"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">
                                    Client's estimated budget: ₹{(targetOpenCase.budget || targetOpenCase.totalFee || 0).toLocaleString()}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estimated Timeline</label>
                                <input
                                    type="text"
                                    value={proposalData.estimatedTimeline}
                                    onChange={(e) => setProposalData({ ...proposalData, estimatedTimeline: e.target.value })}
                                    placeholder="e.g. 2-3 Weeks or Immediate Filing"
                                    className="w-full h-11 border rounded-xl px-4 text-sm font-semibold"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Proposal Message / Approach</label>
                                <textarea
                                    rows={4}
                                    value={proposalData.proposalNote}
                                    onChange={(e) => setProposalData({ ...proposalData, proposalNote: e.target.value })}
                                    placeholder="State your relevant experience, proposed strategy, or availability for this case..."
                                    className="w-full border rounded-xl p-3 text-sm font-medium"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsApplyModalOpen(false)}
                                    className="px-5 py-2.5 border rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingProposal}
                                    className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isSubmittingProposal ? "Submitting..." : "Send Proposal to Client"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
