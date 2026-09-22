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
  const localAudioSourceRef = useRef(null);
  const lastSpeakingStateRef = useRef(false);

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
    setPeerStatuses((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
    setSpeakingUsers((prev) => {
      if (!prev[peerId]) return prev;
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

    if (localAudioSourceRef.current) {
      try {
        localAudioSourceRef.current.disconnect();
      } catch (e) {}
      localAudioSourceRef.current = null;
    }
    localAnalyserRef.current = null;
    lastSpeakingStateRef.current = false;
    setSpeakingUsers({});

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      localStreamRef.current = null;
    }

    if (roomCodeRef.current) {
      socket.emit("voice-leave", { roomCode: roomCodeRef.current });
      socket.emit("voice-speaking", { roomCode: roomCodeRef.current, isSpeaking: false });
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

    // Attach local mic tracks directly to this peer connection with its stream (msid)
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current);
        } catch (err) {
          console.warn(`[Voice] Error adding local track to peer ${peerId}:`, err);
        }
      });
    } else {
      // If mic is not yet acquired or listen-only, ensure bidirectional transceiver is negotiated
      try {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      } catch (e) {}
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
        // Never use display: none because Chromium throttles/disconnects non-rendered elements
        audio.style.position = "fixed";
        audio.style.width = "1px";
        audio.style.height = "1px";
        audio.style.opacity = "0.01";
        audio.style.pointerEvents = "none";
        audio.style.bottom = "0";
        audio.style.left = "0";
        audio.id = `echo-remote-voice-${peerId}`;
        document.body.appendChild(audio);
        remoteAudioElementsRef.current.set(peerId, audio);
      }

      audio.srcObject = remoteStream;
      audio.muted = !isSpeakerOnRef.current;
      audio.volume = isSpeakerOnRef.current ? 1 : 0;

      const playAudio = () => {
        if (!isSpeakerOnRef.current) return;
        audio.play().catch((err) => {
          console.warn(`[Voice] Autoplay blocked for peer ${peerId}, will retry on user gesture:`, err);
        });
      };

      playAudio();

      // Ensure playback starts as soon as packets arrive from the network
      event.track.onunmute = () => {
        playAudio();
      };
    };

    // Auto-restart ICE on transient network drops
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        console.warn(`[Voice] ICE failed for peer ${peerId}, restarting ICE...`);
        try {
          if (typeof pc.restartIce === "function") {
            pc.restartIce();
          }
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
    if (localStreamRef.current && localStreamRef.current.active && localStreamRef.current.getAudioTracks().length > 0) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track.readyState === "live") {
        track.enabled = isMicOnRef.current;
        return localStreamRef.current;
      }
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      } catch (advancedErr) {
        console.warn("[Voice] Advanced mic constraints failed, using simple audio: true", advancedErr);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
      }

      localStreamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMicOnRef.current;
      }

      // Update all existing peer connections with this audio track
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const audioSender = senders.find((s) => !s.track || s.track.kind === "audio");
        if (audioSender && audioTrack) {
          audioSender.replaceTrack(audioTrack).catch((err) => {
            console.warn("[Voice] Error updating sender track:", err);
          });
        } else if (audioTrack) {
          try {
            pc.addTrack(audioTrack, stream);
          } catch (e) {}
        }
      });

      // Initialize local audio analyser for speaking detection
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        if (audioCtxRef.current && stream) {
          if (localAudioSourceRef.current) {
            try { localAudioSourceRef.current.disconnect(); } catch (e) {}
          }
          const source = audioCtxRef.current.createMediaStreamSource(stream);
          localAudioSourceRef.current = source; // Retained in ref to prevent V8 GC!
          const analyser = audioCtxRef.current.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          localAnalyserRef.current = analyser;
        }
      } catch (err) {
        console.warn("[Voice] Could not create local audio analyser:", err);
      }

      setVoiceError(null);
      return stream;
    } catch (err) {
      console.warn("[Voice] Could not acquire microphone stream:", err);
      setVoiceError("Microphone access not available (Listen Only)");
      return null;
    }
  }, []);

  // Join voice call for the current room
  const joinVoiceCall = useCallback(async (currentRoomCode) => {
    const code = (typeof currentRoomCode === "string" && currentRoomCode.trim())
      ? currentRoomCode.trim()
      : (roomCodeRef.current || roomCode);

    if (!code) {
      console.warn("[Voice] Cannot join voice: no room code provided");
      return;
    }

    setIsConnecting(true);
    unlockAudio();

    await acquireLocalAudio();

    setIsInCall(true);
    setIsConnecting(false);

    socket.emit("voice-join", {
      roomCode: code,
      username: profile?.username || "Guest"
    });

    // Broadcast current mic & speaker state
    socket.emit("voice-status-update", {
      roomCode: code,
      isMuted: !isMicOnRef.current,
      isDeafened: !isSpeakerOnRef.current
    });
  }, [acquireLocalAudio, profile?.username, roomCode, unlockAudio]);

  // Toggle Microphone On / Off
  const toggleMic = useCallback(async () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    isMicOnRef.current = nextState;

    unlockAudio();

    if (nextState) {
      // User is turning mic ON
      let stream = localStreamRef.current;
      if (!stream || !stream.active || stream.getAudioTracks().length === 0) {
        stream = await acquireLocalAudio();
      }
      if (stream) {
        const track = stream.getAudioTracks()[0];
        if (track) {
          track.enabled = true;
          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const audioSender = senders.find((s) => !s.track || s.track.kind === "audio");
            if (audioSender) {
              if (audioSender.track !== track) {
                audioSender.replaceTrack(track).catch(() => {});
              }
            } else {
              try {
                pc.addTrack(track, stream);
              } catch (e) {}
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
      lastSpeakingStateRef.current = false;
    }

    if (roomCodeRef.current) {
      socket.emit("voice-status-update", {
        roomCode: roomCodeRef.current,
        isMuted: !nextState,
        isDeafened: !isSpeakerOnRef.current
      });
      if (!nextState) {
        socket.emit("voice-speaking", {
          roomCode: roomCodeRef.current,
          isSpeaking: false
        });
      }
    }
  }, [isMicOn, acquireLocalAudio, unlockAudio]);

  // Toggle Speaker On / Off (Deafen / Undeafen)
  const toggleSpeaker = useCallback(() => {
    const nextSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(nextSpeakerState);
    isSpeakerOnRef.current = nextSpeakerState;

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

    // Peer speaking status (from socket broadcast)
    const handleVoicePeerSpeaking = ({ socketId, isSpeaking }) => {
      setSpeakingUsers((prev) => {
        if (Boolean(prev[socketId]) === Boolean(isSpeaking)) return prev;
        const updated = { ...prev };
        if (isSpeaking) {
          updated[socketId] = true;
        } else {
          delete updated[socketId];
        }
        return updated;
      });
    };

    socket.on("voice-all-peers", handleVoiceAllPeers);
    socket.on("voice-peer-joined", handleVoicePeerJoined);
    socket.on("voice-offer", handleVoiceOffer);
    socket.on("voice-answer", handleVoiceAnswer);
    socket.on("voice-ice-candidate", handleVoiceIceCandidate);
    socket.on("voice-peer-status", handleVoicePeerStatus);
    socket.on("voice-peer-speaking", handleVoicePeerSpeaking);
    socket.on("voice-peer-left", handleVoicePeerLeft);

    return () => {
      socket.off("voice-all-peers", handleVoiceAllPeers);
      socket.off("voice-peer-joined", handleVoicePeerJoined);
      socket.off("voice-offer", handleVoiceOffer);
      socket.off("voice-answer", handleVoiceAnswer);
      socket.off("voice-ice-candidate", handleVoiceIceCandidate);
      socket.off("voice-peer-status", handleVoicePeerStatus);
      socket.off("voice-peer-speaking", handleVoicePeerSpeaking);
      socket.off("voice-peer-left", handleVoicePeerLeft);
    };
  }, [createPeerConnection, cleanupPeer, unlockAudio]);

  // Volume monitor loop for local mic activity & network speaking broadcast
  useEffect(() => {
    if (!isInCall) {
      setSpeakingUsers({});
      lastSpeakingStateRef.current = false;
      return;
    }

    const dataArray = new Uint8Array(128);
    const interval = setInterval(() => {
      // Check local mic
      if (localAnalyserRef.current && isMicOnRef.current) {
        localAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const isSpeakingNow = avg > 8;

        if (isSpeakingNow !== lastSpeakingStateRef.current) {
          lastSpeakingStateRef.current = isSpeakingNow;
          if (roomCodeRef.current) {
            socket.emit("voice-speaking", {
              roomCode: roomCodeRef.current,
              isSpeaking: isSpeakingNow
            });
          }
        }

        setSpeakingUsers((prev) => {
          const myId = socket.id;
          const myUsername = profile?.username;
          const wasSpeaking = myId && prev[myId];
          if (Boolean(wasSpeaking) === isSpeakingNow) return prev;

          const updated = { ...prev };
          if (isSpeakingNow) {
            if (myId) updated[myId] = true;
            if (myUsername) updated[myUsername] = true;
          } else {
            if (myId) delete updated[myId];
            if (myUsername) delete updated[myUsername];
          }
          return updated;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isInCall, profile?.username]);

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
