import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Video, Mic, MicOff, VideoOff, ScreenShare, PhoneOff, 
    FileText, ArrowLeft, Download, ShieldCheck, Clock, 
    Lock, RefreshCcw, Upload, File, User
} from 'lucide-react';
import { consultationService, IConsultation } from '../services/consultationService';
import { useToast } from '../context/ToastContext';

export default function ConsultationRoom() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success, error } = useToast();

    // Consultation details
    const [consultation, setConsultation] = useState<IConsultation | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'docs'>('details');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // WebRTC Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const processedCandidatesRef = useRef<Set<string>>(new Set());
    const lastProcessedAnswerSdp = useRef<string | null>(null);
    const resettingRef = useRef(false);

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

    // Peer Connection Setup
    const setupPeerConnection = (stream: MediaStream) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
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
                            } else if (activePc.signalingState !== 'stable') {
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
            setConsultation(ended);
            setShowEndModal(false);
            setShowSummaryModal(true);
            success("Consultation session ended and notes saved.");
        } catch (err) {
            console.error("Error ending consultation:", err);
            error("Failed to end consultation");
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
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 font-sans">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold">Connecting to secure consultation channel...</p>
            </div>
        );
    }

    if (!consultation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 font-sans">
                <h3 className="text-xl font-bold text-slate-900">Consultation Room Not Found</h3>
                <button 
                    onClick={() => navigate('/consultations')} 
                    className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                    Back to Consultations
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Exit Consultation Room
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-inner">
                    <Lock className="w-4 h-4 text-primary" />
                    Secure Encrypted Consultation Room
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[75vh]">
                {/* Left Column: Video Call Frame (8 Cols) */}
                <div className="lg:col-span-8 flex flex-col bg-[#0F172A] rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative">
                    {/* Status bar */}
                    <div className="bg-[#1E293B] px-6 py-4 flex items-center justify-between border-b border-slate-800 z-10">
                        <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-ping'}`}></div>
                            <span className="text-white font-extrabold text-sm tracking-tight">{consultation.title}</span>
                            <span className="text-[10px] text-slate-400 bg-[#0F172A] border border-slate-850 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                {isConnected ? 'CONNECTED' : isConnecting ? 'CONNECTING...' : consultation.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#0F172A] px-3 py-1 rounded-lg border border-slate-800 text-[11px] font-bold text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {consultation.scheduledTime}
                        </div>
                    </div>

                    {/* WebRTC Video Container */}
                    <div className="flex-1 w-full relative bg-slate-950 flex items-center justify-center overflow-hidden">
                        {!hasJoinedCall ? (
                            <div className="flex flex-col items-center justify-center p-8 space-y-6 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl mx-4 z-20">
                                <div className="space-y-1.5 text-center">
                                    <h3 className="text-white font-extrabold text-lg tracking-tight">Ready to join?</h3>
                                    <p className="text-xs text-slate-400 font-semibold">Check your audio and video before entering the consultation.</p>
                                </div>

                                {/* Client Presence Indicator in Lobby */}
                                {consultation.meetingJoinedByClient ? (
                                    <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-bold animate-pulse">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                                        Client is in the room • Ready to connect
                                    </div>
                                ) : (
                                    <div className="w-full flex items-center justify-center gap-2 bg-slate-800/80 border border-slate-700/60 text-slate-400 px-4 py-2 rounded-xl text-xs font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Client has not joined yet
                                    </div>
                                )}

                                {/* Local Camera Preview in Lobby */}
                                <div className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner">
                                    {isVideoMuted ? (
                                        <div className="flex flex-col items-center text-slate-500 space-y-1">
                                            <VideoOff className="w-8 h-8" />
                                            <span className="text-[10px] font-bold">Camera off</span>
                                        </div>
                                    ) : (
                                        <video
                                            ref={localVideoCallback}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    
                                    {/* Mic/Video quick toggles in preview */}
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 bg-black/60 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
                                        <button
                                            onClick={handleToggleAudio}
                                            className={`p-1.5 rounded-full transition-colors ${isAudioMuted ? 'text-red-500 hover:bg-red-500/20' : 'text-white hover:bg-white/20'}`}
                                        >
                                            {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
                                        </button>
                                        <button
                                            onClick={handleToggleVideo}
                                            className={`p-1.5 rounded-full transition-colors ${isVideoMuted ? 'text-red-500 hover:bg-red-500/20' : 'text-white hover:bg-white/20'}`}
                                        >
                                            {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={startCall}
                                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    <Video className="w-4 h-4" />
                                    {consultation.meetingJoinedByClient ? "Client is in Room • Join Now" : "Join Consultation Now"}
                                </button>
                            </div>
                        ) : (
                            /* Active Remote Video View */
                            remoteStream && isRemoteVideoActive ? (
                                <video
                                    ref={remoteVideoCallback}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                                    <div className="relative">
                                        <div className="h-28 w-28 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden shadow-2xl">
                                            <User className="h-14 w-14 text-slate-500" />
                                        </div>
                                        {(isConnected || consultation.meetingJoinedByClient) && (
                                            <div className="absolute bottom-1 right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-slate-950 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-white font-bold text-base">{consultation.client?.fullName || "Client"}</h4>
                                        <p className="text-xs text-slate-400 font-medium">
                                            {isConnected 
                                                ? (remoteStream && !isRemoteVideoActive ? "Client camera is turned off" : "Connected (Audio Only)")
                                                : isConnecting 
                                                    ? "Connecting to client..." 
                                                    : consultation.meetingJoinedByClient
                                                        ? "Client has entered room • Connecting video..."
                                                        : "Waiting for client to enter room..."
                                            }
                                        </p>
                                        {consultation.meetingJoinedByClient && !isConnected && (
                                            <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold animate-pulse">
                                                Client Present in Room
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        )}

                        {/* Local Video Picture-in-Picture (PiP) */}
                        {hasJoinedCall && (
                            <div className="absolute bottom-4 right-4 w-40 h-28 sm:w-48 sm:h-36 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-20 group transition-all duration-300 hover:scale-[1.03]">
                                {isVideoMuted ? (
                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500">
                                        <VideoOff className="w-6 h-6" />
                                    </div>
                                ) : (
                                    <video
                                        ref={localVideoCallback}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {/* Local Stream Status Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent p-2.5 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <div className="flex justify-end">
                                        <span className="bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white px-2 py-0.5 rounded-lg border border-white/10">
                                            You (Counsel)
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5 justify-center">
                                        {isAudioMuted && (
                                            <span className="p-1 bg-primary/80 rounded-lg text-white">
                                                <MicOff className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                        {isVideoMuted && (
                                            <span className="p-1 bg-primary/80 rounded-lg text-white">
                                                <VideoOff className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meeting Control Bar */}
                    {hasJoinedCall && (
                        <div className="bg-[#1E293B] border-t border-slate-800 px-6 py-4 flex items-center justify-center gap-4 z-10">
                            <button
                                onClick={handleToggleAudio}
                                className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${
                                    isAudioMuted 
                                    ? 'bg-red-500/20 border-red-500 text-red-400' 
                                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                                }`}
                                title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
                            >
                                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>

                            <button
                                onClick={handleToggleVideo}
                                className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${
                                    isVideoMuted 
                                    ? 'bg-red-500/20 border-red-500 text-red-400' 
                                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                                }`}
                                title={isVideoMuted ? "Start Video" : "Stop Video"}
                            >
                                {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                            </button>

                            <button
                                onClick={handleShareScreen}
                                className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${
                                    isScreenSharing
                                    ? 'bg-primary border-primary text-white font-bold'
                                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                                }`}
                                title="Share Screen"
                            >
                                <ScreenShare className="w-5 h-5" />
                            </button>

                            <div className="w-px h-8 bg-slate-800 mx-2" />

                            <button
                                onClick={() => setShowEndModal(true)}
                                className="h-12 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-[0.98]"
                                title="End Call"
                            >
                                <PhoneOff className="w-5 h-5" />
                                End Call
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column: Interaction sidebar (details & shared files) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full">
                    {/* Tab header */}
                    <div className="bg-slate-50 border-b border-slate-200 flex items-center justify-start p-1.5 h-14 shrink-0">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 rounded-xl text-xs font-bold transition-all h-full flex items-center justify-center ${
                                activeTab === 'details' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Consultation Details
                        </button>
                        <button
                            onClick={() => setActiveTab('docs')}
                            className={`flex-1 rounded-xl text-xs font-bold transition-all h-full flex items-center justify-center ${
                                activeTab === 'docs' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Shared Documents ({consultation.documents?.length || 0})
                        </button>
                    </div>

                    {/* Tab content area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeTab === 'details' ? (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client In Consultation</span>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                                            <ShieldCheck className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-slate-900 text-sm leading-none">{consultation.client?.fullName}</h4>
                                            <p className="text-[10px] text-slate-400 mt-1 font-bold truncate max-w-[200px]">{consultation.client?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advocate (You)</span>
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-semibold text-slate-700">
                                        <p className="text-slate-950 font-bold">{consultation.lawyer?.fullName}</p>
                                        <p className="text-[10px] text-primary font-bold uppercase mt-0.5">{consultation.lawyer?.expertise || "Advocate"}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description / Inquiry Details</span>
                                    <p className="text-xs text-slate-650 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-2xl whitespace-pre-wrap font-medium">
                                        {consultation.description}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Time</span>
                                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold text-slate-700">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span>
                                            {new Date(consultation.scheduledDate).toLocaleDateString()} • {consultation.scheduledTime}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-200 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-1 shrink-0">
                                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Shared Documents</h4>
                                    <button 
                                        onClick={fetchDetails}
                                        className="text-[10px] font-bold text-primary flex items-center gap-1"
                                    >
                                        <RefreshCcw size={10} /> Sync
                                    </button>
                                </div>

                                {/* Upload trigger */}
                                <div className="shrink-0">
                                    <input 
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept=".jpeg,.jpg,.png,.gif,.pdf,.doc,.docx"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingDoc}
                                        className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 h-11 transition-colors"
                                    >
                                        <Upload className="h-4 w-4" />
                                        {uploadingDoc ? "Uploading..." : "Upload New File"}
                                    </button>
                                    <p className="text-[9px] text-slate-400 text-center mt-1.5 leading-relaxed">
                                        Share legal drafts, case files, or review documents.
                                    </p>
                                </div>

                                <hr className="border-slate-100 shrink-0" />

                                <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                                    {consultation.documents?.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                                            <FileText size={28} className="mx-auto mb-2 text-slate-350" />
                                            <p className="font-bold text-xs">No documents uploaded yet</p>
                                        </div>
                                    ) : (
                                        consultation.documents.map((doc, idx) => (
                                            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2.5 truncate">
                                                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 shrink-0">
                                                        <File className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="truncate">
                                                        <h5 className="font-bold text-slate-800 text-xs truncate" title={doc.name}>{doc.name}</h5>
                                                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">By {doc.uploadedBy}</span>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`/lawyer${doc.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 hover:text-slate-900 shrink-0 transition-colors shadow-sm"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Confirm End Call with Notes */}
            {showEndModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                                <PhoneOff className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Conclude Consultation?</h3>
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
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs h-11 transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                                disabled={isEnding}
                            >
                                {isEnding ? "Concluding..." : "Confirm & End Session"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Consultation Summary (Rejoin Prevented) */}
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
                                        <span className="font-bold text-slate-800">{consultation.client?.fullName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Duration</span>
                                        <span className="font-bold text-slate-800">{consultation.meetingDuration ? `${consultation.meetingDuration} mins` : "Completed"}</span>
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
                                    This consultation has concluded. If the client requests follow-up sessions, they will be required to book and pay for a new consultation.
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
        </div>
    );
}
