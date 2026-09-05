import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";
import { SessionContext } from "./SessionContext";
import { ProfileContext } from "./ProfileContext";

export const VoiceContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
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

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteAudioElementsRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());

  const isMicOnRef = useRef(isMicOn);
  isMicOnRef.current = isMicOn;

  const isSpeakerOnRef = useRef(isSpeakerOn);
  isSpeakerOnRef.current = isSpeakerOn;

  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  // Cleanup helper for a single peer connection
  const cleanupPeer = useCallback((peerId) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
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
  }, []);

  // Cleanup all peers and local stream
  const leaveVoiceCall = useCallback(() => {
    peerConnectionsRef.current.forEach((pc, peerId) => {
      cleanupPeer(peerId);
    });
    peerConnectionsRef.current.clear();
    remoteAudioElementsRef.current.clear();
    pendingCandidatesRef.current.clear();

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

    // Add local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
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
      const [remoteStream] = event.streams;
      let audio = remoteAudioElementsRef.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.playsInline = true;
        remoteAudioElementsRef.current.set(peerId, audio);
      }
      audio.srcObject = remoteStream;
      audio.muted = !isSpeakerOnRef.current;
      audio.volume = isSpeakerOnRef.current ? 1 : 0;
      audio.play().catch((err) => {
        console.warn("Autoplay remote audio blocked, waiting for interaction:", err);
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupPeer(peerId);
      }
    };

    return pc;
  }, [cleanupPeer]);

  // Get local mic stream (or fallback if permission denied)
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
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isMicOnRef.current;
      });
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

    const stream = await acquireLocalAudio();
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
  }, [acquireLocalAudio, profile?.username]);

  // Toggle Microphone On / Off
  const toggleMic = useCallback(async () => {
    const nextState = !isMicOn;

    if (nextState) {
      // User is trying to unmute - ensure stream exists
      if (!localStreamRef.current || !localStreamRef.current.active) {
        const stream = await acquireLocalAudio();
        if (stream) {
          // Add tracks to all existing peer connections
          peerConnectionsRef.current.forEach((pc) => {
            stream.getAudioTracks().forEach((track) => {
              pc.addTrack(track, stream);
            });
          });
        }
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }

    setIsMicOn(nextState);
    if (roomCodeRef.current) {
      socket.emit("voice-status-update", {
        roomCode: roomCodeRef.current,
        isMuted: !nextState,
        isDeafened: !isSpeakerOnRef.current
      });
    }
  }, [isMicOn, acquireLocalAudio]);

  // Toggle Speaker On / Off (Deafen / Undeafen)
  const toggleSpeaker = useCallback(() => {
    const nextSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(nextSpeakerState);

    // Mute/unmute all active remote audio streams
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.muted = !nextSpeakerState;
      audio.volume = nextSpeakerState ? 1 : 0;
      if (nextSpeakerState) {
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
  }, [isSpeakerOn]);

  // Handle room changes: automatically join voice when entering a room, leave when leaving
  useEffect(() => {
    if (roomCode) {
      joinVoiceCall(roomCode);
    } else {
      leaveVoiceCall();
    }

    return () => {
      leaveVoiceCall();
    };
  }, [roomCode, joinVoiceCall, leaveVoiceCall]);

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

    socket.on("voice-all-peers", handleVoiceAllPeers);
    socket.on("voice-offer", handleVoiceOffer);
    socket.on("voice-answer", handleVoiceAnswer);
    socket.on("voice-ice-candidate", handleVoiceIceCandidate);
    socket.on("voice-peer-status", handleVoicePeerStatus);
    socket.on("voice-peer-left", handleVoicePeerLeft);

    return () => {
      socket.off("voice-all-peers", handleVoiceAllPeers);
      socket.off("voice-offer", handleVoiceOffer);
      socket.off("voice-answer", handleVoiceAnswer);
      socket.off("voice-ice-candidate", handleVoiceIceCandidate);
      socket.off("voice-peer-status", handleVoicePeerStatus);
      socket.off("voice-peer-left", handleVoicePeerLeft);
    };
  }, [createPeerConnection, cleanupPeer]);

  return (
    <VoiceContext.Provider
      value={{
        isMicOn,
        isSpeakerOn,
        isInCall,
        isConnecting,
        voiceError,
        peerStatuses,
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
