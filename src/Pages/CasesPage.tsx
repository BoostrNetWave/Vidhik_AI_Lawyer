import React, { useEffect, useState } from "react";
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
    Percent
} from "lucide-react";
import { caseService, ICase, IMilestone } from "../services/caseService";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmationContext";

export default function CasesPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    
    const [cases, setCases] = useState<ICase[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedCase, setSelectedCase] = useState<ICase | null>(null);
    
    // Create Case Form Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        clientEmail: "",
        title: "",
        description: "",
        totalFee: ""
    });
    const [isSubmittingCase, setIsSubmittingCase] = useState(false);

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

    // File upload loading state
    const [uploadingMilestoneIndex, setUploadingMilestoneIndex] = useState<number | null>(null);
    const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadDetails, setUploadDetails] = useState<string>("");

    const fetchCases = async () => {
        setLoading(true);
        try {
            const data = await caseService.getCases();
            setCases(data);
            if (selectedCase) {
                const updated = data.find(c => c._id === selectedCase._id);
                if (updated) setSelectedCase(updated);
            }
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to load cases");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleCreateCaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createFormData.clientEmail || !createFormData.title || !createFormData.description || !createFormData.totalFee) {
            error("Please fill in all fields");
            return;
        }

        setIsSubmittingCase(true);
        try {
            const newCase = await caseService.createCase({
                clientEmail: createFormData.clientEmail,
                title: createFormData.title,
                description: createFormData.description,
                totalFee: Number(createFormData.totalFee)
            });
            success("Case Engagement created successfully!");
            setIsCreateModalOpen(false);
            setCreateFormData({ clientEmail: "", title: "", description: "", totalFee: "" });
            fetchCases();
            setSelectedCase(newCase);
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to create case engagement");
        } finally {
            setIsSubmittingCase(false);
        }
    };

    const handleAddBuilderMilestone = () => {
        setBuilderMilestones([
            ...builderMilestones,
            { title: "", description: "", progressIncrement: 0, payoutAmount: 0 }
        ]);
    };

    const handleRemoveBuilderMilestone = (index: number) => {
        setBuilderMilestones(builderMilestones.filter((_, i) => i !== index));
    };

    const handleBuilderMilestoneChange = (index: number, field: string, value: any) => {
        const updated = [...builderMilestones];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setBuilderMilestones(updated);
    };

    const handleAutoDistributePayout = () => {
        if (!selectedCase) return;
        const total = selectedCase.totalFee;
        const count = builderMilestones.length;
        if (count === 0) return;

        const updated = builderMilestones.map(m => ({
            ...m,
            payoutAmount: Math.round((m.progressIncrement / 100) * total)
        }));
        setBuilderMilestones(updated);
    };

    const handleSubmitPlan = async () => {
        if (!selectedCase) return;

        // Validation
        for (let i = 0; i < builderMilestones.length; i++) {
            const m = builderMilestones[i];
            if (!m.title.trim() || !m.description.trim()) {
                error(`Roadmap Stage ${i + 1} must have a title and description.`);
                return;
            }
        }

        const totalProgress = builderMilestones.reduce((sum, m) => sum + Number(m.progressIncrement), 0);
        if (totalProgress !== 100) {
            error(`Progress increments must sum to exactly 100%. Current sum: ${totalProgress}%`);
            return;
        }

        const totalPayout = builderMilestones.reduce((sum, m) => sum + Number(m.payoutAmount), 0);
        if (totalPayout > selectedCase.totalFee) {
            error(`Total milestone payouts (₹${totalPayout}) cannot exceed the total case fee (₹${selectedCase.totalFee})`);
            return;
        }

        confirm({
            title: "Submit Action Plan",
            message: "This will send the detailed procedural plan to the client for their review and approval. Proceed?",
            type: "info",
            confirmText: "Submit Plan",
            onConfirm: async () => {
                try {
                    const updated = await caseService.submitPlan(selectedCase._id, builderMilestones);
                    success("Action plan submitted for client approval!");
                    fetchCases();
                } catch (err: any) {
                    error(err.response?.data?.message || "Failed to submit plan");
                }
            }
        });
    };

    const handleUpdateMilestoneStatus = async (index: number, newStatus: 'pending' | 'in_progress' | 'completed') => {
        if (!selectedCase) return;

        try {
            const updated = await caseService.updateMilestoneStatus(selectedCase._id, index, newStatus);
            success(`Milestone status updated to ${newStatus}`);
            fetchCases();
        } catch (err: any) {
            error(err.response?.data?.message || "Failed to update milestone");
        }
    };

    const handleFileUploadWithDetails = async (index: number) => {
        if (!selectedCase || !uploadFile) return;

        setUploadingMilestoneIndex(index);
        try {
            await caseService.uploadProof(selectedCase._id, index, uploadFile, uploadDetails);
            success("Verification document and progress details uploaded successfully!");
            setActiveUploadIndex(null);
            setUploadFile(null);
            setUploadDetails("");
            fetchCases();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "File upload failed");
        } finally {
            setUploadingMilestoneIndex(null);
        }
    };

    const handleRequestPayout = async (index: number) => {
        if (!selectedCase) return;

        confirm({
            title: "Request Payout",
            message: "Request milestone payment release from the Super Admin. Please ensure all proof documents are uploaded.",
            type: "info",
            confirmText: "Request Payout",
            onConfirm: async () => {
                try {
                    await caseService.requestPayout(selectedCase._id, index);
                    success("Payout request submitted to Super Admin!");
                    fetchCases();
                } catch (err: any) {
                    error(err.response?.data?.message || "Failed to request payout");
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-primary rounded-xl text-white shadow-lg shadow-indigo-100">
                            <Briefcase size={22} />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Client Engagements</h1>
                    </div>
                    <p className="text-slate-500 text-sm">Create cases, define action roadmaps, track progress, and request payments upon proof verification.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-primary/95 transition-all active:scale-[0.98] gap-2"
                >
                    <PlusCircle size={20} />
                    New Engagement
                </button>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Cases List (4 Cols) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
                    <h3 className="font-extrabold text-slate-900 text-lg">Active Cases</h3>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search engagements..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-inner"
                        />
                    </div>

                    {loading && cases.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-2 text-xs text-slate-400 font-bold">Syncing cases...</p>
                        </div>
                    ) : cases.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                            <Briefcase size={36} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-sm">No cases found</p>
                            <p className="text-xs text-slate-400 px-4 mt-1">Start by creating a new client case engagement.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {cases.map((c) => (
                                <div
                                    key={c._id}
                                    onClick={() => setSelectedCase(c)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                        selectedCase?._id === c._id
                                            ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                            : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm"
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug truncate">{c.title}</h4>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                                            c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{c.description}</p>
                                    
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-3">
                                        <div className="flex items-center gap-1.5">
                                            <User size={12} className="text-slate-400" />
                                            <span className="text-slate-700 truncate max-w-[120px]">{c.client?.fullName || "Unassigned"}</span>
                                        </div>
                                        <span className="text-slate-900 font-black">₹{c.totalFee.toLocaleString()}</span>
                                    </div>

                                    {/* Small Progress Bar */}
                                    <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                                            style={{ width: `${c.currentProgress}%` }}
                                        ></div>
                                    </div>
                                    <div className="mt-1 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Progress</span>
                                        <span className="text-primary">{c.currentProgress}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side: Case Detail View (8 Cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {selectedCase ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
                            
                            {/* Case Header Details */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">{selectedCase.title}</h2>
                                    <p className="text-xs text-slate-400 font-medium">Case ID: <span className="font-mono">{selectedCase._id}</span></p>
                                </div>
                                <div className="flex flex-row items-center gap-6 shrink-0 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4">
                                    <div>
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Client Name</p>
                                        <p className="text-sm font-black text-slate-900">{selectedCase.client?.fullName}</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200" />
                                    <div>
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Total Payout Fee</p>
                                        <p className="text-sm font-black text-primary">₹{selectedCase.totalFee.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Case Description */}
                            <div className="space-y-2">
                                <h4 className="font-extrabold text-slate-900 text-sm">Engagement Details</h4>
                                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 border border-slate-100 rounded-2xl p-4">{selectedCase.description}</p>
                            </div>

                            {/* Action Roadmap & Milestone Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-extrabold text-slate-900 text-lg">Procedural Roadmap & Stages</h3>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                        selectedCase.planApproved 
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                            : selectedCase.planSubmitted 
                                                ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                                : "bg-red-50 text-red-700 border border-red-100"
                                    }`}>
                                        {selectedCase.planApproved 
                                            ? "Roadmap Approved by Client" 
                                            : selectedCase.planSubmitted 
                                                ? "Roadmap Awaiting Client Approval" 
                                                : "Action Plan Required"}
                                    </span>
                                </div>

                                {!selectedCase.planSubmitted ? (
                                    /* ROADMAP BUILDER (No plan submitted yet) */
                                    <div className="bg-slate-50/40 border border-slate-200 rounded-3xl p-6 space-y-6">
                                        <div className="space-y-1">
                                            <h4 className="font-extrabold text-slate-900 text-sm">Outline Case Milestones</h4>
                                            <p className="text-xs text-slate-500 leading-normal">
                                                Create a transparent work process for your client. The sum of all progress increments must equal 100%. Payouts can be configured per milestone.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {builderMilestones.map((bm, idx) => (
                                                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBuilderMilestone(idx)}
                                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pr-6">
                                                        <div className="md:col-span-7 space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestone {idx + 1} Title</label>
                                                            <input
                                                                type="text"
                                                                value={bm.title}
                                                                onChange={(e) => handleBuilderMilestoneChange(idx, 'title', e.target.value)}
                                                                placeholder="e.g. Drafting & Filing Petition"
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2 space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress Contribution (%)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={bm.progressIncrement}
                                                                    onChange={(e) => handleBuilderMilestoneChange(idx, 'progressIncrement', Number(e.target.value))}
                                                                    placeholder="20"
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-7 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                                />
                                                                <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            </div>
                                                        </div>
                                                        <div className="md:col-span-3 space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payout Amount (₹)</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                                                <input
                                                                    type="number"
                                                                    value={bm.payoutAmount}
                                                                    onChange={(e) => handleBuilderMilestoneChange(idx, 'payoutAmount', Number(e.target.value))}
                                                                    placeholder="10000"
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step Details</label>
                                                        <textarea
                                                            rows={2}
                                                            value={bm.description}
                                                            onChange={(e) => handleBuilderMilestoneChange(idx, 'description', e.target.value)}
                                                            placeholder="Describe the legal processes followed in this stage..."
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap justify-between items-center gap-4 border-t border-slate-200 pt-4">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={handleAddBuilderMilestone}
                                                    className="px-4 py-2 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:border-primary transition-all"
                                                >
                                                    + Add Roadmap Stage
                                                </button>
                                                <button
                                                    onClick={handleAutoDistributePayout}
                                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                                >
                                                    Auto-Distribute Fees
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleSubmitPlan}
                                                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-50 hover:bg-primary/95 transition-all"
                                            >
                                                Submit Engagement Roadmap
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ROADMAP VIEW & MANAGEMENT */
                                    <div className="space-y-6">
                                        
                                        {/* Dynamic Progress Indicator */}
                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Progress Checker</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl font-black text-slate-900">{selectedCase.currentProgress}%</span>
                                                    <span className="text-xs text-slate-500 font-bold">of work verified</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 max-w-md bg-slate-200 rounded-full h-3 overflow-hidden">
                                                <div 
                                                    className="bg-primary h-3 rounded-full transition-all duration-700" 
                                                    style={{ width: `${selectedCase.currentProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Milestones Stepper */}
                                        <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 ml-3 py-2">
                                            {selectedCase.milestones.map((m, idx) => {
                                                const isCompleted = m.status === 'completed';
                                                const isInProgress = m.status === 'in_progress';
                                                
                                                return (
                                                    <div key={idx} className="relative">
                                                        {/* Stepper Dot */}
                                                        <div className={`absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-4 border-white ${
                                                            isCompleted 
                                                                ? "bg-green-500 shadow-md ring-4 ring-green-50" 
                                                                : isInProgress 
                                                                    ? "bg-primary animate-pulse ring-4 ring-indigo-50" 
                                                                    : "bg-slate-300"
                                                        }`} />

                                                        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 hover:shadow-sm transition-all duration-200">
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-xs font-black text-slate-400">STAGE {idx + 1}</span>
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                        <span className="text-xs font-extrabold text-slate-600">Contribution: {m.progressIncrement}%</span>
                                                                    </div>
                                                                    <h4 className="font-extrabold text-slate-900 text-base">{m.title}</h4>
                                                                </div>

                                                                {/* Status Actions */}
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                                                        isCompleted 
                                                                            ? "bg-green-50 text-green-700 border border-green-100" 
                                                                            : isInProgress 
                                                                                ? "bg-primary/10 text-primary border border-primary/20" 
                                                                                : "bg-slate-100 text-slate-600"
                                                                    }`}>
                                                                        {m.status.replace('_', ' ')}
                                                                    </span>
                                                                    
                                                                    {selectedCase.planApproved && !isCompleted && (
                                                                        <select
                                                                            value={m.status}
                                                                            onChange={(e) => handleUpdateMilestoneStatus(idx, e.target.value as any)}
                                                                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-slate-700"
                                                                        >
                                                                            <option value="pending">Set Pending</option>
                                                                            <option value="in_progress">Set In Progress</option>
                                                                            <option value="completed">Mark Completed</option>
                                                                        </select>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <p className="text-slate-500 text-xs leading-relaxed">{m.description}</p>

                                                            {/* Upload Proof Document section */}
                                                            {selectedCase.planApproved && (
                                                                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                                                                        <div className="space-y-1 flex-1">
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proof of Work & Progress Updates</p>
                                                                            {m.proofDocs.length === 0 ? (
                                                                                <p className="text-xs text-amber-600 font-bold flex items-center gap-1">
                                                                                    <AlertCircle size={12} />
                                                                                    No progress proof uploaded yet for this stage.
                                                                                </p>
                                                                            ) : (
                                                                                <div className="space-y-3">
                                                                                    {m.proofDocs.map((doc, dIdx) => {
                                                                                        const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url);
                                                                                        return (
                                                                                            <div key={dIdx} className="space-y-2 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                                    <a 
                                                                                                        href={`http://localhost:3000/lawyer${doc.url}`}
                                                                                                        target="_blank"
                                                                                                        rel="noreferrer"
                                                                                                        className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1.5"
                                                                                                    >
                                                                                                        <FileText size={12} />
                                                                                                        <span>{doc.name}</span>
                                                                                                        <ExternalLink size={10} />
                                                                                                    </a>
                                                                                                    <span className="text-[9px] text-slate-400 font-medium">({new Date(doc.uploadedAt).toLocaleString()})</span>
                                                                                                </div>
                                                                                                {doc.details && (
                                                                                                    <p className="text-[11px] text-slate-650 bg-slate-100/70 border border-slate-200/60 rounded-lg p-2.5 mt-1.5 leading-relaxed font-normal">
                                                                                                        {doc.details}
                                                                                                    </p>
                                                                                                )}
                                                                                                {isImg && (
                                                                                                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-w-sm shadow-sm relative group">
                                                                                                        <img 
                                                                                                            src={`http://localhost:3000/lawyer${doc.url}`} 
                                                                                                            alt={doc.name}
                                                                                                            className="max-h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                                                                                        />
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Upload Form / Button */}
                                                                        <div className="shrink-0">
                                                                            {activeUploadIndex === idx ? (
                                                                                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-md max-w-xs sm:max-w-md w-full">
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select File / Photo</label>
                                                                                        <input
                                                                                            type="file"
                                                                                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                                                            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                                                                                            accept="image/*,.pdf,.doc,.docx"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progress details / Note</label>
                                                                                        <textarea
                                                                                            value={uploadDetails}
                                                                                            onChange={(e) => setUploadDetails(e.target.value)}
                                                                                            placeholder="Describe the progress (e.g. drafted agreement, filed in court)..."
                                                                                            rows={2}
                                                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex gap-2 justify-end">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setActiveUploadIndex(null);
                                                                                                setUploadFile(null);
                                                                                                setUploadDetails("");
                                                                                            }}
                                                                                            className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleFileUploadWithDetails(idx)}
                                                                                            disabled={!uploadFile || uploadingMilestoneIndex === idx}
                                                                                            className="px-2.5 py-1.5 bg-primary text-white font-bold rounded-xl text-[11px] hover:bg-primary/95 disabled:opacity-50"
                                                                                        >
                                                                                            {uploadingMilestoneIndex === idx ? "Uploading..." : "Submit Proof"}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setActiveUploadIndex(idx);
                                                                                        setUploadFile(null);
                                                                                        setUploadDetails("");
                                                                                    }}
                                                                                    className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-sm gap-2"
                                                                                >
                                                                                    <Upload size={14} />
                                                                                    Upload Proof / Photo
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {/* Payout Area */}
                                                                    {isCompleted && (
                                                                        <div className="flex flex-row justify-between items-center p-4 rounded-xl border border-slate-100 mt-3 bg-slate-50/30">
                                                                            <div>
                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Milestone Payment</p>
                                                                                <p className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                                                                                    <Coins size={14} className="text-orange-500" />
                                                                                    ₹{m.payoutAmount.toLocaleString()}
                                                                                </p>
                                                                            </div>
                                                                            
                                                                            {m.payoutStatus === 'pending' ? (
                                                                                <button
                                                                                    onClick={() => handleRequestPayout(idx)}
                                                                                    disabled={m.proofDocs.length === 0}
                                                                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    Request Payout Release
                                                                                </button>
                                                                            ) : (
                                                                                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl ${
                                                                                    m.payoutStatus === 'approved' 
                                                                                        ? "bg-green-100 text-green-700" 
                                                                                        : m.payoutStatus === 'requested' 
                                                                                            ? "bg-amber-100 text-amber-700 animate-pulse" 
                                                                                            : "bg-red-105 text-red-700"
                                                                                }`}>
                                                                                    {m.payoutStatus === 'approved' ? "Payout Released (Paid)" : m.payoutStatus === 'requested' ? "Awaiting Payout Release" : "Payout Rejected"}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                            <Briefcase size={48} className="mx-auto mb-4 text-slate-300" />
                            <h3 className="font-extrabold text-slate-900 text-xl">Select a Case Engagement</h3>
                            <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">
                                Choose an engagement from the sidebar list to view client details, build or track roadmaps, manage proofs, and request financial payouts.
                            </p>
                        </div>
                    )}
                </div>

            </div>

            {/* CREATE CASE ENGAGEMENT MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-900 text-lg">Create Engagement Case</h3>
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                Cancel
                            </button>
                        </div>

                        <form onSubmit={handleCreateCaseSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Client Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={createFormData.clientEmail}
                                    onChange={(e) => setCreateFormData({ ...createFormData, clientEmail: e.target.value })}
                                    placeholder="client@example.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Case / Project Title</label>
                                <input
                                    type="text"
                                    required
                                    value={createFormData.title}
                                    onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                                    placeholder="e.g. Property Title Verification"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Engagement Scope / Description</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={createFormData.description}
                                    onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                                    placeholder="Describe the scope of work..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Total Contract Value / Payout Fee (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        required
                                        value={createFormData.totalFee}
                                        onChange={(e) => setCreateFormData({ ...createFormData, totalFee: e.target.value })}
                                        placeholder="50000"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingCase}
                                className="w-full h-12 bg-primary text-white font-extrabold rounded-xl shadow-lg shadow-indigo-50 hover:bg-primary/95 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmittingCase ? "Creating..." : "Create Case & Add Roadmap"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
