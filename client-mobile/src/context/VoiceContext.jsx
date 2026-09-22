import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";
import { SessionContext } from "./SessionContext";
import { ProfileContext } from "./ProfileContext";

export const VoiceContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:openrelay.metered.ca:80" }
  ],
  iceCandidatePoolSize: 10
};

export default function VoiceProvider({ children }) {
  const { roomCode } = useContext(SessionContext);
  const { profile } = useContext(ProfileContext);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [peerStatuses, setPeerStatuses] = useState({});
  const [speakingUsers, setSpeakingUsers] = useState({});

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteAudioElementsRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const audioCtxRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const remoteAnalysersRef = useRef(new Map());

  const isMicOnRef = useRef(isMicOn);
  isMicOnRef.current = isMicOn;

  const isSpeakerOnRef = useRef(isSpeakerOn);
  isSpeakerOnRef.current = isSpeakerOn;

  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  // Unlock all paused audio elements and resume AudioContext on user interaction
  const unlockAudio = useCallback(() => {
    remoteAudioElementsRef.current.forEach((audio) => {
      if (audio.paused && audio.srcObject && isSpeakerOnRef.current) {
        audio.play().catch(() => {});
      }
    });
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  // Global interaction unlocker for browsers' strict Autoplay Policy
  useEffect(() => {
    const handleInteraction = () => unlockAudio();
    window.addEventListener("click", handleInteraction, { passive: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction, { passive: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [unlockAudio]);

  // Cleanup helper for a single peer connection
  const cleanupPeer = useCallback((peerId) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {}
      peerConnectionsRef.current.delete(peerId);
    }
    const audio = remoteAudioElementsRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
      remoteAudioElementsRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
    remoteAnalysersRef.current.delete(peerId);
    setPeerStatuses((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  }, []);

  // Cleanup all peers and local stream
  const leaveVoiceCall = useCallback(() => {
    peerConnectionsRef.current.forEach((pc, peerId) => {
      cleanupPeer(peerId);
    });
    peerConnectionsRef.current.clear();
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    });
    remoteAudioElementsRef.current.clear();
    pendingCandidatesRef.current.clear();
    remoteAnalysersRef.current.clear();
    localAnalyserRef.current = null;
    setSpeakingUsers({});

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (roomCodeRef.current) {
      socket.emit("voice-leave", { roomCode: roomCodeRef.current });
    }

    setIsInCall(false);
    setIsConnecting(false);
    setPeerStatuses({});
  }, [cleanupPeer]);

  // Create an RTCPeerConnection for a target peer
  const createPeerConnection = useCallback((peerId) => {
    if (peerConnectionsRef.current.has(peerId)) {
      cleanupPeer(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);

    // Always create a bidirectional audio transceiver so SDP negotiates audio send & receive
    // regardless of whether local mic is initially ready or muted!
    const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });

    // If local mic track is available, attach to transceiver sender
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const localTrack = localStreamRef.current.getAudioTracks()[0];
      transceiver.sender.replaceTrack(localTrack).catch((err) => {
        console.warn("Could not set initial track on sender:", err);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice-ice-candidate", {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Remote audio track handler
    pc.ontrack = (event) => {
      const remoteStream = (event.streams && event.streams[0])
        ? event.streams[0]
        : new MediaStream([event.track]);

      let audio = remoteAudioElementsRef.current.get(peerId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.playsInline = true;
        audio.style.display = "none";
        audio.id = `echo-remote-voice-${peerId}`;
        document.body.appendChild(audio);
        remoteAudioElementsRef.current.set(peerId, audio);
      }
      audio.srcObject = remoteStream;
      audio.muted = !isSpeakerOnRef.current;
      audio.volume = isSpeakerOnRef.current ? 1 : 0;

      const playAudio = () => {
        audio.play().catch((err) => {
          console.warn(`Autoplay audio waiting for interaction for peer ${peerId}:`, err);
        });
      };
      playAudio();

      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        if (audioCtxRef.current && remoteStream) {
          const source = audioCtxRef.current.createMediaStreamSource(remoteStream);
          const analyser = audioCtxRef.current.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          remoteAnalysersRef.current.set(peerId, analyser);
        }
      } catch (err) {
        console.warn("Could not create remote audio analyser:", err);
      }
    };

    // Auto-restart ICE on transient network drops
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        console.warn(`[Voice] ICE failed for peer ${peerId}, restarting ICE...`);
        try {
          pc.restartIce();
        } catch (e) {}
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupPeer(peerId);
      }
    };

    return pc;
  }, [cleanupPeer]);

  // Get local mic stream
  const acquireLocalAudio = useCallback(async () => {
    if (localStreamRef.current && localStreamRef.current.active) {
      return localStreamRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      localStreamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMicOnRef.current;
      }

      // Update all peer connection audio senders with the newly acquired track
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => !s.track || s.track.kind === "audio");
        if (sender && audioTrack) {
          sender.replaceTrack(audioTrack).catch((err) => {
            console.warn("Error updating sender track:", err);
          });
        }
      });

      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        if (audioCtxRef.current && stream) {
          const source = audioCtxRef.current.createMediaStreamSource(stream);
          const analyser = audioCtxRef.current.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          localAnalyserRef.current = analyser;
        }
      } catch (err) {
        console.warn("Could not create local audio analyser:", err);
      }
      setVoiceError(null);
      return stream;
    } catch (err) {
      console.warn("Could not acquire microphone stream:", err);
      setVoiceError("Microphone access not available (Listen Only)");
      return null;
    }
  }, []);

  // Join voice call for the current room
  const joinVoiceCall = useCallback(async (currentRoomCode) => {
    if (!currentRoomCode) return;
    setIsConnecting(true);

    unlockAudio();
    await acquireLocalAudio();
    setIsInCall(true);
    setIsConnecting(false);

    socket.emit("voice-join", {
      roomCode: currentRoomCode,
      username: profile?.username || "Guest"
    });

    // Broadcast current mic & speaker state
    socket.emit("voice-status-update", {
      roomCode: currentRoomCode,
      isMuted: !isMicOnRef.current,
      isDeafened: !isSpeakerOnRef.current
    });
  }, [acquireLocalAudio, profile?.username, unlockAudio]);

  // Toggle Microphone On / Off
  const toggleMic = useCallback(async () => {
    const nextState = !isMicOn;

    unlockAudio();

    if (nextState) {
      // User is turning mic ON
      let stream = localStreamRef.current;
      if (!stream || !stream.active) {
        stream = await acquireLocalAudio();
      }
      if (stream) {
        const track = stream.getAudioTracks()[0];
        if (track) {
          track.enabled = true;
          // Use replaceTrack on all active senders without needing renegotiation
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => !s.track || s.track.kind === "audio");
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            }
          });
        }
      }
    } else {
      // User is turning mic OFF (Mute)
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    }

    setIsMicOn(nextState);

    if (roomCodeRef.current) {
      socket.emit("voice-status-update", {
        roomCode: roomCodeRef.current,
        isMuted: !nextState,
        isDeafened: !isSpeakerOnRef.current
      });
    }
  }, [isMicOn, acquireLocalAudio, unlockAudio]);

  // Toggle Speaker On / Off (Deafen / Undeafen)
  const toggleSpeaker = useCallback(() => {
    const nextSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(nextSpeakerState);

    unlockAudio();

    // Mute/unmute all active remote audio streams
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.muted = !nextSpeakerState;
      audio.volume = nextSpeakerState ? 1 : 0;
      if (nextSpeakerState && audio.paused && audio.srcObject) {
        audio.play().catch(() => {});
      }
    });

    if (roomCodeRef.current) {
      socket.emit("voice-status-update", {
        roomCode: roomCodeRef.current,
        isMuted: !isMicOnRef.current,
        isDeafened: !nextSpeakerState
      });
    }
  }, [isSpeakerOn, unlockAudio]);

  // Leave voice call when leaving a room or unmounting (do not auto-join)
  useEffect(() => {
    if (!roomCode) {
      leaveVoiceCall();
    }

    return () => {
      leaveVoiceCall();
    };
  }, [roomCode, leaveVoiceCall]);

  // Socket signaling listeners
  useEffect(() => {
    // Received list of existing peers in the room: initiate caller offers
    const handleVoiceAllPeers = async (peers) => {
      if (!peers || !Array.isArray(peers)) return;

      for (const peer of peers) {
        const peerId = peer.id;
        try {
          const pc = createPeerConnection(peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("voice-offer", {
            targetId: peerId,
            offer
          });
        } catch (err) {
          console.error("Error creating voice offer to peer", peerId, err);
        }
      }
    };

    // Another peer sent an offer
    const handleVoiceOffer = async ({ from, offer }) => {
      try {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any queued candidates for this peer
        const candidates = pendingCandidatesRef.current.get(from) || [];
        for (const candidate of candidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current.delete(from);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("voice-answer", {
          targetId: from,
          answer
        });
      } catch (err) {
        console.error("Error handling voice offer from", from, err);
      }
    };

    // Caller receives answer from responder
    const handleVoiceAnswer = async ({ from, answer }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          const candidates = pendingCandidatesRef.current.get(from) || [];
          for (const candidate of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current.delete(from);
        }
      } catch (err) {
        console.error("Error handling voice answer from", from, err);
      }
    };

    // Receive ICE candidate from peer
    const handleVoiceIceCandidate = async ({ from, candidate }) => {
      if (!candidate) return;
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Queue candidate until remote description is set
          const queue = pendingCandidatesRef.current.get(from) || [];
          queue.push(candidate);
          pendingCandidatesRef.current.set(from, queue);
        }
      } catch (err) {
        console.error("Error handling ICE candidate from", from, err);
      }
    };

    // Peer status update (muted / deafened)
    const handleVoicePeerStatus = ({ socketId, isMuted, isDeafened }) => {
      setPeerStatuses((prev) => ({
        ...prev,
        [socketId]: { isMuted, isDeafened }
      }));
    };

    // Peer left voice / room
    const handleVoicePeerLeft = ({ socketId }) => {
      cleanupPeer(socketId);
    };

    // Peer joined voice
    const handleVoicePeerJoined = ({ socketId, username }) => {
      console.log("[Voice] Peer joined call:", socketId, username);
      unlockAudio();
    };

    socket.on("voice-all-peers", handleVoiceAllPeers);
    socket.on("voice-peer-joined", handleVoicePeerJoined);
    socket.on("voice-offer", handleVoiceOffer);
    socket.on("voice-answer", handleVoiceAnswer);
    socket.on("voice-ice-candidate", handleVoiceIceCandidate);
    socket.on("voice-peer-status", handleVoicePeerStatus);
    socket.on("voice-peer-left", handleVoicePeerLeft);

    return () => {
      socket.off("voice-all-peers", handleVoiceAllPeers);
      socket.off("voice-peer-joined", handleVoicePeerJoined);
      socket.off("voice-offer", handleVoiceOffer);
      socket.off("voice-answer", handleVoiceAnswer);
      socket.off("voice-ice-candidate", handleVoiceIceCandidate);
      socket.off("voice-peer-status", handleVoicePeerStatus);
      socket.off("voice-peer-left", handleVoicePeerLeft);
    };
  }, [createPeerConnection, cleanupPeer, unlockAudio]);

  // Volume monitor loop for talking bars
  useEffect(() => {
    if (!isInCall) {
      setSpeakingUsers({});
      return;
    }

    const dataArray = new Uint8Array(128);
    const interval = setInterval(() => {
      const nextSpeaking = {};

      // Check local mic
      if (localAnalyserRef.current && isMicOnRef.current) {
        localAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        if (avg > 10 && socket.id) {
          nextSpeaking[socket.id] = true;
        }
      }

      // Check remote peers
      remoteAnalysersRef.current.forEach((analyser, peerId) => {
        const isPeerMuted = peerStatuses[peerId]?.isMuted;
        if (!isPeerMuted && isSpeakerOnRef.current) {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          if (avg > 10) {
            nextSpeaking[peerId] = true;
          }
        }
      });

      setSpeakingUsers(prev => {
        const prevKeys = Object.keys(prev).filter(k => prev[k]).sort();
        const nextKeys = Object.keys(nextSpeaking).filter(k => nextSpeaking[k]).sort();
        if (prevKeys.length !== nextKeys.length || prevKeys.some((k, i) => k !== nextKeys[i])) {
          return nextSpeaking;
        }
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isInCall, peerStatuses]);

  return (
    <VoiceContext.Provider
      value={{
        isMicOn,
        isSpeakerOn,
        isInCall,
        isConnecting,
        voiceError,
        peerStatuses,
        speakingUsers,
        toggleMic,
        toggleSpeaker,
        joinVoiceCall,
        leaveVoiceCall
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}
