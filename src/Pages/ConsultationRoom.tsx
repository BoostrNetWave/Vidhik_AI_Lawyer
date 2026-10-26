import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Video, Mic, MicOff, VideoOff, ScreenShare, PhoneOff, 
    FileText, ArrowLeft, Download, ShieldCheck, Clock, 
    Lock, RefreshCcw, Upload, File, User, Eye, ExternalLink, X,
    PanelRightClose, PanelRightOpen, Shield, Sparkles, CheckCircle2, AlertCircle, Wifi
} from 'lucide-react';
import { consultationService, IConsultation } from '../services/consultationService';
import { useToast } from '../context/ToastContext';
import { getFileUrl, isImageFile, isPdfFile, formatFileSize } from '../lib/fileUtils';

export default function ConsultationRoom() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success, error } = useToast();

    // Consultation details
    const [consultation, setConsultation] = useState<IConsultation | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'docs'>('details');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
    const [callDuration, setCallDuration] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // WebRTC Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const processedCandidatesRef = useRef<Set<string>>(new Set());
    const processedDocSignalsRef = useRef<Set<string>>(new Set());
    const pollTickCountRef = useRef<number>(0);
    const lastProcessedAnswerSdp = useRef<string | null>(null);
    const resettingRef = useRef(false);

    // Image preview lightbox state
    const [previewModal, setPreviewModal] = useState<{ url: string; title: string } | null>(null);

    // Call Toggles & Status
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [hasJoinedCall, setHasJoinedCall] = useState(false);

    // End call & summary modals
    const [showEndModal, setShowEndModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [meetingNotes, setMeetingNotes] = useState("");
    const [isEnding, setIsEnding] = useState(false);

    // Elapsed session timer
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (hasJoinedCall && isConnected) {
            timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [hasJoinedCall, isConnected]);

    const formatCallDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const clientName = consultation?.client?.fullName || "Client";
    const clientInitials = clientName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "CL";

    const localVideoCallback = useCallback((node: HTMLVideoElement | null) => {
        (localVideoRef as any).current = node;
        const stream = localStreamRef.current || localStream;
        if (node && stream) {
            if (node.srcObject !== stream) {
                node.srcObject = stream;
            }
            node.play().catch(err => console.warn("Local video play blocked:", err));
        }
    }, [localStream]);

    const remoteVideoCallback = useCallback((node: HTMLVideoElement | null) => {
        (remoteVideoRef as any).current = node;
        if (node && remoteStream) {
            node.srcObject = remoteStream;
            node.play().catch(err => console.warn("Remote video play blocked:", err));
        }
    }, [remoteStream]);

    // Ensure instant local feed display whenever joining call or video state changes
    useEffect(() => {
        const stream = localStreamRef.current || localStream;
        if (localVideoRef.current && stream && !isVideoMuted) {
            if (localVideoRef.current.srcObject !== stream) {
                localVideoRef.current.srcObject = stream;
            }
            localVideoRef.current.play().catch(err => console.warn("Local video play error:", err));
        }
    }, [hasJoinedCall, localStream, isVideoMuted]);

    useEffect(() => {
        if (remoteStream) {
            const checkVideoTracks = () => {
                const videoTracks = remoteStream.getVideoTracks();
                setIsRemoteVideoActive(videoTracks.length > 0 && videoTracks[0].enabled);
            };

            checkVideoTracks();
            remoteStream.onaddtrack = checkVideoTracks;
            remoteStream.onremovetrack = checkVideoTracks;

            const interval = setInterval(checkVideoTracks, 1000);
            return () => clearInterval(interval);
        } else {
            setIsRemoteVideoActive(false);
        }
    }, [remoteStream]);

    // Local stream acquisition
    const startLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: { ideal: "user" }
                }
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.warn("Could not acquire audio/video, trying audio only...", err);
            try {
                const audioOnly = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
                localStreamRef.current = audioOnly;
                setLocalStream(audioOnly);
                setIsVideoMuted(true);
                return audioOnly;
            } catch (audioErr) {
                console.error("Audio permission error:", audioErr);
                error("Camera and microphone permission denied. Please allow permissions in browser.");
                throw audioErr;
            }
        }
    };

    const fetchDetails = async () => {
        try {
            const data = await consultationService.getConsultationById(id!);
            setConsultation(data);
        } catch (err) {
            console.error(err);
            error("Failed to load room details");
        }
    };

    // Silent background poll to synchronize new documents in real-time
    const fetchDetailsSilent = useCallback(async () => {
        try {
            const data = await consultationService.getConsultationById(id!);
            if (data) {
                setConsultation(prev => {
                    if (!prev) return data;
                    const prevDocs = prev.documents || [];
                    const newDocs = data.documents || [];
                    if (prevDocs.length !== newDocs.length || JSON.stringify(prevDocs) !== JSON.stringify(newDocs) || prev.status !== data.status) {
                        return { ...prev, ...data };
                    }
                    return prev;
                });
            }
        } catch (_err) {
            // Silently ignore background poll errors
        }
    }, [id]);

    useEffect(() => {
        const initRoom = async () => {
            try {
                setLoading(true);
                const [data] = await Promise.all([
                    consultationService.getConsultationById(id!),
                    startLocalStream().catch(err => {
                        console.warn("Could not acquire local preview on mount:", err);
                        return null;
                    })
                ]);
                setConsultation(data);
                if (data?.status === 'completed') {
                    setShowSummaryModal(true);
                }
            } catch (err) {
                console.error(err);
                error("Failed to load room details");
            } finally {
                setLoading(false);
            }
        };

        initRoom();

        // Background polling for client presence & completed status
        const statusPoll = setInterval(async () => {
            if (!id) return;
            try {
                const refreshed = await consultationService.getConsultationById(id);
                if (refreshed) {
                    setConsultation(prev => {
                        if (prev && prev.status !== 'completed' && refreshed.status === 'completed') {
                            if (localStreamRef.current) {
                                localStreamRef.current.getTracks().forEach(t => t.stop());
                            }
                            if (peerConnectionRef.current) {
                                peerConnectionRef.current.close();
                            }
                            setShowSummaryModal(true);
                            error("This consultation has ended.");
                        }
                        return refreshed;
                    });
                }
            } catch (err) {
                console.error("Consultation status polling error:", err);
            }
        }, 2500);

        return () => {
            clearInterval(statusPoll);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [id]);

    // Protect against accidental tab closes or page reloads while call is active
    useEffect(() => {
        if (!hasJoinedCall || showSummaryModal) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'You have an active video consultation session. Are you sure you want to leave?';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasJoinedCall, showSummaryModal]);

    const handleRenegotiationReset = async () => {
        if (resettingRef.current) return;
        resettingRef.current = true;
        try {
            console.log("Renegotiating consultation video session...");
            setIsConnected(false);
            setIsConnecting(true);
            setRemoteStream(null);
            processedCandidatesRef.current.clear();
            lastProcessedAnswerSdp.current = null;

            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            await consultationService.clearSignals(id!).catch(err => console.error(err));

            if (localStreamRef.current) {
                const pc = setupPeerConnection(localStreamRef.current);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                await consultationService.sendSignal(id!, {
                    sender: 'lawyer',
                    type: 'offer',
                    sdp: offer.sdp
                });
                console.log("Lawyer new consultation offer sent.");
            }
        } catch (err) {
            console.error("Error during renegotiation reset:", err);
        } finally {
            resettingRef.current = false;
        }
    };

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            if (remoteVideoRef.current.srcObject !== remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            remoteVideoRef.current.play().catch(err => console.warn("Remote video play error:", err));
        }
    }, [remoteStream]);

    // Peer Connection Setup
    const setupPeerConnection = (stream: MediaStream) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                {
                    urls: [
                        'turn:openrelay.metered.ca:80',
                        'turn:openrelay.metered.ca:80?transport=tcp',
                        'turn:openrelay.metered.ca:443',
                        'turn:openrelay.metered.ca:443?transport=tcp',
                        'turns:openrelay.metered.ca:443',
                        'turns:openrelay.metered.ca:443?transport=tcp'
                    ],
                    username: 'openrelay',
                    credential: 'openrelay'
                }
            ],
            iceCandidatePoolSize: 10
        });

        // Add local tracks
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        // Local ICE candidate
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                consultationService.sendSignal(id!, {
                    sender: 'lawyer',
                    type: 'candidate',
                    candidate: JSON.stringify(event.candidate)
                }).catch(err => console.error("Error sending lawyer candidate:", err));
            }
        };

        // Capture remote tracks
        pc.ontrack = (event) => {
            console.log("Lawyer received remote track:", event.track.kind);
            const remoteTracks = pc.getReceivers()
                .map(r => r.track)
                .filter(t => t && t.readyState === 'live');

            console.log("Lawyer active remote tracks count:", remoteTracks.length);
            if (remoteTracks.length > 0) {
                setRemoteStream(new MediaStream(remoteTracks));
                setIsConnected(true);
                setIsConnecting(false);
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log("Lawyer ICE Connection State:", state);
            if (state === 'connected' || state === 'completed') {
                setIsConnected(true);
                setIsConnecting(false);
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                setIsConnected(false);
                setRemoteStream(null);
                handleRenegotiationReset();
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    // Polling Signaling Channel
    const startPolling = () => {
        const poll = async () => {
            const pc = peerConnectionRef.current;
            if (!pc) return;
            try {
                const signals = await consultationService.getSignals(id!);
                const remoteSignals = signals.filter((s: any) => s.sender === 'client');

                // 1. Process Answer from Client
                const answerSignal = remoteSignals.find((s: any) => s.type === 'answer');
                if (answerSignal) {
                    if (answerSignal.sdp !== lastProcessedAnswerSdp.current) {
                        lastProcessedAnswerSdp.current = answerSignal.sdp;
                        const activePc = peerConnectionRef.current;
                        if (activePc) {
                            if (activePc.signalingState === 'have-local-offer') {
                                console.log("Lawyer setting remote answer...");
                                await activePc.setRemoteDescription(new RTCSessionDescription({
                                    type: 'answer',
                                    sdp: answerSignal.sdp
                                }));
                                console.log("Lawyer set remote answer successfully");
                            } else {
                                // Answer SDP changed, but we are not in have-local-offer. Client must have refreshed/reset.
                                console.log("Client answer SDP changed, triggering session reset...");
                                handleRenegotiationReset();
                            }
                        }
                    }
                }

                // 2. Process Candidates from Client
                const candidateSignals = remoteSignals.filter((s: any) => s.type === 'candidate');
                for (const signal of candidateSignals) {
                    if (signal._id && !processedCandidatesRef.current.has(signal._id)) {
                        if (!pc.remoteDescription || !pc.remoteDescription.type) {
                            continue;
                        }
                        processedCandidatesRef.current.add(signal._id);
                        try {
                            const candidateObj = JSON.parse(signal.candidate);
                            if (candidateObj) {
                                await pc.addIceCandidate(new RTCIceCandidate(candidateObj));
                            }
                        } catch (iceErr) {
                            console.error("Error adding lawyer ICE candidate:", iceErr);
                        }
                    }
                }

                // 3. Process Real-Time Document Updates from Client
                const docSignals = remoteSignals.filter((s: any) => s.type === 'document_update');
                for (const signal of docSignals) {
                    if (signal._id && !processedDocSignalsRef.current.has(signal._id)) {
                        processedDocSignalsRef.current.add(signal._id);
                        fetchDetailsSilent();
                        success(`Client uploaded a new document: ${signal.name || ''}`);
                    }
                }

                // 4. Periodic background sync of consultation details (every 3 seconds)
                pollTickCountRef.current = (pollTickCountRef.current || 0) + 1;
                if (pollTickCountRef.current % 2 === 0) {
                    fetchDetailsSilent();
                }
            } catch (err) {
                console.error("Error in lawyer signaling poll:", err);
            }
        };

        poll();
        pollingIntervalRef.current = setInterval(poll, 1500);
    };

    const startCall = async () => {
        setHasJoinedCall(true);
        try {
            let stream = localStreamRef.current;
            if (!stream) {
                stream = await startLocalStream();
            }

            if (localVideoRef.current && stream) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play().catch(() => {});
            }

            // Mark consultation as joined by lawyer in database
            consultationService.joinConsultation(id!)
                .then(updated => {
                    if (updated) setConsultation(updated);
                })
                .catch(err => console.error("Error updating lawyer joined state:", err));

            // Await clearSignals to finish BEFORE creating and sending the offer
            await consultationService.clearSignals(id!).catch(err => console.error("Error clearing signals:", err));

            const pc = setupPeerConnection(stream);
            setIsConnecting(true);

            console.log("Lawyer creating consultation offer...");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await consultationService.sendSignal(id!, {
                sender: 'lawyer',
                type: 'offer',
                sdp: offer.sdp
            });

            startPolling();
        } catch (err) {
            console.error("Error starting consultation call:", err);
            error("Failed to start call. Please check permissions and try again.");
            setHasJoinedCall(false);
        }
    };

    // Controls
    const handleToggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    };

    const handleToggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoMuted(!videoTrack.enabled);
            }
        }
    };

    const handleShareScreen = async () => {
        if (isScreenSharing) {
            stopScreenSharing();
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            const senders = peerConnectionRef.current?.getSenders();
            const sender = senders?.find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(screenTrack);
            }

            const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
            if (oldVideoTrack) oldVideoTrack.stop();

            localStreamRef.current?.removeTrack(oldVideoTrack!);
            localStreamRef.current?.addTrack(screenTrack);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
            }

            setIsScreenSharing(true);

            screenTrack.onended = () => {
                stopScreenSharing();
            };
        } catch (err) {
            console.error("Error sharing screen:", err);
        }
    };

    const stopScreenSharing = async () => {
        try {
            const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = userMediaStream.getVideoTracks()[0];

            const senders = peerConnectionRef.current?.getSenders();
            const sender = senders?.find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(cameraTrack);
                
                const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
                if (oldVideoTrack) oldVideoTrack.stop();

                localStreamRef.current?.removeTrack(oldVideoTrack!);
                localStreamRef.current?.addTrack(cameraTrack);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }
                setIsScreenSharing(false);
            }
        } catch (err) {
            console.error("Error restoring camera track:", err);
        }
    };

    const handleDisconnect = () => {
        if (hasJoinedCall) {
            setShowEndModal(true);
        } else {
            consultationService.clearSignals(id!).catch(err => console.error(err));
            navigate('/consultations');
        }
    };

    const handleEndCall = async () => {
        setIsEnding(true);
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            await consultationService.clearSignals(id!).catch(console.error);
            const ended = await consultationService.endConsultation(id!, { meetingNotes });
            if (ended) setConsultation(ended);
            setShowEndModal(false);
            setShowSummaryModal(true);
            success("Consultation session ended and notes saved.");
        } catch (err: any) {
            console.error("Error ending consultation:", err);
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            if (peerConnectionRef.current) peerConnectionRef.current.close();
            setShowEndModal(false);
            setShowSummaryModal(true);
            success("Consultation session concluded.");
        } finally {
            setIsEnding(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingDoc(true);
        try {
            await consultationService.uploadDocument(id!, file);
            success("Document uploaded successfully!");
            // Signal remote client in real-time across servers
            consultationService.sendSignal(id!, {
                sender: 'lawyer',
                type: 'document_update',
                name: file.name
            }).catch(err => console.error("Error sending doc update signal:", err));
            fetchDetails();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to upload document");
        } finally {
            setUploadingDoc(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[75vh] gap-4 font-sans">
                <div className="relative">
                    <div className="h-14 w-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-primary" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <p className="text-slate-900 font-bold text-base">Establishing Secure Consultation Suite</p>
                    <p className="text-slate-400 text-xs">Authenticating legal counsel session and peer channels...</p>
                </div>
            </div>
        );
    }

    if (!consultation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 font-sans">
                <div className="h-16 w-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center border border-red-100">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-slate-900">Consultation Session Not Found</h3>
                    <p className="text-slate-500 text-xs max-w-sm">
                        This session link may have expired or you may not have authorization to access it.
                    </p>
                </div>
                <button 
                    onClick={() => navigate('/consultations')} 
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/20"
                >
                    Return to Consultations
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-4 pb-8 font-sans">
            {/* Top Executive Header Bar */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white border border-slate-200/80 px-5 py-3.5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDisconnect}
                        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-950 bg-slate-100/80 hover:bg-slate-200/80 px-3 py-2 rounded-xl transition-all group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Exit Suite</span>
                    </button>

                    <div className="h-5 w-px bg-slate-200" />

                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                {consultation.title}
                            </h2>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wider uppercase border ${
                                isConnected 
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                    : isConnecting 
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse' 
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {isConnected ? 'LIVE SESSION' : isConnecting ? 'CONNECTING...' : consultation.status}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                            Client: <span className="text-slate-800 font-bold">{clientName}</span> • You (Counsel)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Live Duration Timer Badge */}
                    {hasJoinedCall && isConnected && (
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                            <span>{formatCallDuration(callDuration)}</span>
                        </div>
                    )}

                    {/* Security Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-inner">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        <span className="hidden md:inline">256-Bit Encrypted</span>
                        <span className="md:hidden">TLS Secure</span>
                    </div>

                    {hasJoinedCall && (
                        <button
                            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                isWorkspaceOpen 
                                    ? 'bg-primary/10 text-primary border-primary/30' 
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={isWorkspaceOpen ? "Hide Workspace" : "Show Workspace"}
                        >
                            {isWorkspaceOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                            <span className="hidden sm:inline">Workspace</span>
                            {consultation.documents?.length ? (
                                <span className="bg-primary/20 text-primary text-[10px] px-1.5 rounded-full font-bold">
                                    {consultation.documents.length}
                                </span>
                            ) : null}
                        </button>
                    )}
                </div>
            </header>

            {/* Main Video & Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[76vh] min-h-[580px]">
                {/* Video Conference Stage */}
                <div className={`${isWorkspaceOpen ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-300 flex flex-col bg-slate-950 rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl relative`}>
                    
                    {/* Video Content Canvas */}
                    <div className="flex-1 w-full relative bg-radial from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
                        {!hasJoinedCall ? (
                            /* ================= PRE-JOIN STUDIO CHECK ================= */
                            <div className="w-full max-w-xl p-6 sm:p-8 space-y-6 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl mx-4 z-20 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                                            Studio Pre-Check • Counsel
                                        </span>
                                        <h3 className="text-xl font-black text-white tracking-tight">Ready to enter legal consultation?</h3>
                                    </div>
                                    <div className="h-10 w-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-primary">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Client Presence Pill */}
                                {consultation.meetingJoinedByClient ? (
                                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-2xl text-xs font-bold animate-pulse">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                                        <div className="flex-1">
                                            <p className="leading-tight">{clientName} is waiting in the consultation room</p>
                                            <span className="text-[10px] text-emerald-400/80 font-normal">Connect now to begin the encrypted counsel session</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-slate-800/70 border border-slate-700/70 text-slate-300 p-3.5 rounded-2xl text-xs font-semibold">
                                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div className="flex-1">
                                            <p className="leading-tight">{clientName} has not joined yet</p>
                                            <span className="text-[10px] text-slate-400 font-normal">You can enter the room first; the peer session connects automatically</span>
                                        </div>
                                    </div>
                                )}

                                {/* Camera Preview Viewport */}
                                <div className="w-full h-56 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner group">
                                    {isVideoMuted ? (
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                                            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                                                <VideoOff className="w-7 h-7 text-slate-600" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">Camera is paused</span>
                                        </div>
                                    ) : (
                                        <video
                                            ref={localVideoCallback}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover scale-x-[-1]"
                                        />
                                    )}

                                    {/* Status badge on preview */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/10">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                        Counsel Preview
                                    </div>

                                    {/* Mic & Cam quick toggles */}
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-xl">
                                        <button
                                            type="button"
                                            onClick={handleToggleAudio}
                                            className={`p-2 rounded-full transition-all ${
                                                isAudioMuted 
                                                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' 
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                            title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
                                        >
                                            {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
                                        </button>
                                        <div className="w-px h-4 bg-white/10" />
                                        <button
                                            type="button"
                                            onClick={handleToggleVideo}
                                            className={`p-2 rounded-full transition-all ${
                                                isVideoMuted 
                                                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' 
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                            title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
                                        >
                                            {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Join Button */}
                                <button
                                    onClick={startCall}
                                    disabled={isConnecting}
                                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl shadow-xl shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                                >
                                    <Video className="w-4 h-4" />
                                    <span>{consultation.meetingJoinedByClient ? `Connect with ${clientName}` : "Enter Consultation Room"}</span>
                                </button>
                            </div>
                        ) : (
                            /* ================= ACTIVE VIDEO STAGE ================= */
                            <>
                                {remoteStream && isRemoteVideoActive ? (
                                    <video
                                        ref={remoteVideoCallback}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    /* Remote Audio / Waiting Persona Card */
                                    <div className="flex flex-col items-center justify-center text-center p-8 space-y-5 animate-in fade-in duration-300">
                                        <div className="relative">
                                            {/* Ambient glowing aura */}
                                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                                            <div className="relative h-28 w-28 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700/80 flex items-center justify-center text-white text-2xl font-black shadow-2xl">
                                                {clientInitials}
                                            </div>
                                            {isConnected && (
                                                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-slate-950"></span>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 max-w-sm">
                                            <h4 className="text-white font-extrabold text-lg tracking-tight">
                                                {clientName}
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium">
                                                {isConnected 
                                                    ? (remoteStream ? "Audio connected • Video paused by client" : "Connected to session") 
                                                    : isConnecting 
                                                        ? "Connecting peer-to-peer session..." 
                                                        : "Awaiting client connection..."}
                                            </p>
                                            {consultation.meetingJoinedByClient && !isConnected && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-bold mt-2">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                                    Client present in room • Handshake in progress
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Local Picture-in-Picture (PiP) */}
                                <div className="absolute bottom-20 sm:bottom-6 right-4 sm:right-6 w-44 sm:w-56 aspect-video bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-20 group transition-all duration-300 hover:scale-[1.03]">
                                    {isVideoMuted ? (
                                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-500 gap-1">
                                            <VideoOff className="w-5 h-5 text-slate-600" />
                                            <span className="text-[10px] font-bold text-slate-400">Camera Paused</span>
                                        </div>
                                    ) : (
                                        <video
                                            ref={localVideoCallback}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover scale-x-[-1]"
                                        />
                                    )}

                                    {/* Status Tag Overlay */}
                                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold text-white border border-white/10">
                                        <span>You (Counsel)</span>
                                        {isAudioMuted && <MicOff className="w-2.5 h-2.5 text-rose-400 ml-0.5" />}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Floating Ergonomic Control Dock */}
                    {hasJoinedCall && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-2xl border border-white/10 px-4 py-2.5 rounded-full shadow-2xl shadow-black/80">
                            <button
                                type="button"
                                onClick={handleToggleAudio}
                                className={`h-11 w-11 rounded-full flex items-center justify-center border transition-all ${
                                    isAudioMuted 
                                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30' 
                                        : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                                }`}
                                title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
                            >
                                {isAudioMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                            </button>

                            <button
                                type="button"
                                onClick={handleToggleVideo}
                                className={`h-11 w-11 rounded-full flex items-center justify-center border transition-all ${
                                    isVideoMuted 
                                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30' 
                                        : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                                }`}
                                title={isVideoMuted ? "Start camera" : "Stop camera"}
                            >
                                {isVideoMuted ? <VideoOff className="w-4.5 h-4.5" /> : <Video className="w-4.5 h-4.5" />}
                            </button>

                            <button
                                type="button"
                                onClick={handleShareScreen}
                                className={`h-11 w-11 rounded-full flex items-center justify-center border transition-all ${
                                    isScreenSharing
                                        ? 'bg-primary border-primary text-white font-bold'
                                        : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                                }`}
                                title="Share Screen"
                            >
                                <ScreenShare className="w-4.5 h-4.5" />
                            </button>

                            <div className="w-px h-6 bg-white/15 mx-1" />

                            <button
                                type="button"
                                onClick={() => setShowEndModal(true)}
                                className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95"
                                title="End Call"
                            >
                                <PhoneOff className="w-4 h-4" />
                                <span>End Session</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Integrated Legal Workspace Drawer */}
                {isWorkspaceOpen && (
                    <aside className="lg:col-span-4 bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xl flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-200">
                        {/* Tab Switcher */}
                        <div className="bg-slate-50 border-b border-slate-200/80 p-2 shrink-0">
                            <div className="flex bg-slate-200/60 p-1 rounded-2xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                        activeTab === 'details' 
                                            ? 'bg-white text-slate-900 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Case Details
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('docs')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'docs' 
                                            ? 'bg-white text-slate-900 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span>Documents</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                        activeTab === 'docs' ? 'bg-primary text-white' : 'bg-slate-300 text-slate-700'
                                    }`}>
                                        {consultation.documents?.length || 0}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {activeTab === 'details' ? (
                                <div className="space-y-5">
                                    {/* Client Card */}
                                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Client Profile</span>
                                        <div className="flex items-center gap-3">
                                            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                                                {clientInitials}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate">{clientName}</h4>
                                                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{consultation.client?.email || 'Registered Client'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advocate (You) Card */}
                                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Counsel in Session</span>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-extrabold text-slate-900 text-sm">{consultation.lawyer?.fullName || 'Legal Counsel'}</p>
                                                <p className="text-xs text-primary font-bold">{consultation.lawyer?.expertise || 'Advocate'}</p>
                                            </div>
                                            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-bold">
                                                You
                                            </span>
                                        </div>
                                    </div>

                                    {/* Agenda / Inquiry Details */}
                                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-3">
                                        <div>
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Consultation Agenda</span>
                                            <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                                                {consultation.description || 'General Legal Advisory Session'}
                                            </p>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-600">
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <Clock className="w-3.5 h-3.5 text-primary" />
                                                {consultation.scheduledTime || 'Scheduled Time'}
                                            </span>
                                            <span className="text-primary font-bold">
                                                ₹{consultation.totalFee}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Security Notice */}
                                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
                                        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <p className="leading-relaxed font-medium">
                                            This video counsel session and document exchange is cryptographically protected under attorney-client privilege.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 flex flex-col h-full">
                                    {/* Upload trigger */}
                                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept=".jpeg,.jpg,.png,.gif,.pdf,.doc,.docx"
                                        />
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingDoc}
                                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                                            >
                                                {uploadingDoc ? "Encrypting & Uploading..." : "Upload Legal File"}
                                            </button>
                                            <p className="text-[10px] text-slate-400 mt-1.5">
                                                PDFs, Case Records, Court Orders, or Images (Max 25MB)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                                            Session Shared Files
                                        </span>
                                        <button 
                                            onClick={fetchDetails}
                                            className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                                        >
                                            <RefreshCcw size={10} /> Sync
                                        </button>
                                    </div>

                                    {/* Document List */}
                                    <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-0.5">
                                        {consultation.documents?.length === 0 ? (
                                            <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                                                <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                                                <p className="font-bold text-xs text-slate-500">No documents uploaded yet</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Shared files will appear here instantly for both parties</p>
                                            </div>
                                        ) : (
                                            consultation.documents.map((doc, idx) => {
                                                const fileUrl = getFileUrl(doc.url);
                                                const isImg = isImageFile(doc.url) || isImageFile(doc.name);
                                                const isPdf = isPdfFile(doc.url) || isPdfFile(doc.name);
                                                return (
                                                    <div key={idx} className="p-3 bg-white border border-slate-200/80 rounded-2xl flex flex-col gap-2.5 shadow-sm hover:border-primary/40 transition-all">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className={`p-2 rounded-xl shrink-0 ${
                                                                    isImg 
                                                                        ? 'bg-amber-50 text-amber-600' 
                                                                        : isPdf 
                                                                            ? 'bg-rose-50 text-rose-600' 
                                                                            : 'bg-primary/10 text-primary'
                                                                }`}>
                                                                    {isImg ? <Eye className="h-4 w-4" /> : isPdf ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h5 className="font-bold text-slate-800 text-xs truncate max-w-[150px] sm:max-w-[200px]" title={doc.name}>
                                                                        {doc.name}
                                                                    </h5>
                                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                                        <span>{doc.uploadedBy || 'Lawyer'}</span>
                                                                        {doc.size ? <span>• {formatFileSize(doc.size)}</span> : null}
                                                                        {doc.uploadedAt ? <span>• {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : null}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {isImg && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewModal({ url: fileUrl, title: doc.name })}
                                                                        className="h-8 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 transition-colors"
                                                                        title="Preview Image"
                                                                    >
                                                                        <Eye size={13} />
                                                                        <span className="hidden sm:inline">Preview</span>
                                                                    </button>
                                                                )}
                                                                <a
                                                                    href={fileUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                                                                    title="Open file in new tab"
                                                                >
                                                                    <ExternalLink size={13} />
                                                                </a>
                                                                <a
                                                                    href={fileUrl}
                                                                    download={doc.name}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
                                                                    title="Download file"
                                                                >
                                                                    <Download size={13} />
                                                                </a>
                                                            </div>
                                                        </div>

                                                        {isImg && (
                                                            <div 
                                                                className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
                                                                onClick={() => setPreviewModal({ url: fileUrl, title: doc.name })}
                                                            >
                                                                <img
                                                                    src={fileUrl}
                                                                    alt={doc.name}
                                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLElement).style.display = 'none';
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                                                                    <Eye size={14} /> Click to expand
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* Modal: Confirm End Call with Notes */}
            {showEndModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                <PhoneOff className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Conclude Legal Consultation?</h3>
                                <p className="text-xs text-slate-400">This will finalize the session and prevent any rejoining.</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Legal Advice & Meeting Summary Notes (Optional)
                            </label>
                            <textarea
                                value={meetingNotes}
                                onChange={(e) => setMeetingNotes(e.target.value)}
                                placeholder="Summarize your advice, key points discussed, or next legal steps for the client..."
                                rows={4}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEndModal(false)}
                                className="flex-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs h-11 transition-colors"
                                disabled={isEnding}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEndCall}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs h-11 transition-colors shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                                disabled={isEnding}
                            >
                                {isEnding ? "Concluding..." : "Confirm & End Session"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Consultation Summary */}
            {showSummaryModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    Consultation Concluded
                                </span>
                                <h3 className="text-xl font-extrabold text-slate-900">Session Summary</h3>
                            </div>
                            <div className="h-10 w-10 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center text-emerald-600">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1 font-sans">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Topic / Title</span>
                                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{consultation.title}</h4>
                                    </div>
                                    <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                        ₹{consultation.totalFee} Fee
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Client</span>
                                        <span className="font-bold text-slate-800">{clientName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Duration</span>
                                        <span className="font-bold text-slate-800">{consultation.meetingDuration ? `${consultation.meetingDuration} mins` : (callDuration > 0 ? formatCallDuration(callDuration) : "Completed")}</span>
                                    </div>
                                </div>
                            </div>

                            {consultation.meetingNotes && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded Notes & Legal Advice</span>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                        {consultation.meetingNotes}
                                    </div>
                                </div>
                            )}

                            {/* Rejoin Blocked Notice */}
                            <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                                <p className="font-bold flex items-center gap-1.5 text-slate-900">
                                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                                    Session Finalized • Rejoin Disabled
                                </p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    This consultation has concluded and all records are archived in your case records.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => navigate('/consultations')}
                                className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl h-11 text-xs shadow-md shadow-primary/20 transition-all"
                            >
                                Back to Consultations
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Image Lightbox Preview */}
            {previewModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
                            <h4 className="text-sm font-bold text-white truncate max-w-md">{previewModal.title}</h4>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewModal.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                    title="Open Fullscreen"
                                >
                                    <ExternalLink size={16} />
                                </a>
                                <button
                                    onClick={() => setPreviewModal(null)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50">
                            <img
                                src={previewModal.url}
                                alt={previewModal.title}
                                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
