import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";
import { SessionContext } from "./SessionContext";
import { ProfileContext } from "./ProfileContext";

export const StreamContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

export default function StreamProvider({ children }) {
  const { roomCode } = useContext(SessionContext);
  const { profile } = useContext(ProfileContext);

  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [isConnectingStream, setIsConnectingStream] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [streamVolume, setStreamVolume] = useState(1);
  const [isStreamMuted, setIsStreamMuted] = useState(false);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const streamerPeerConnectionsRef = useRef(new Map()); // viewerId -> RTCPeerConnection
  const viewerPeerConnectionRef = useRef(null); // RTCPeerConnection to streamer
  const streamerPendingCandidatesRef = useRef(new Map()); // viewerId -> candidates[]
  const viewerPendingCandidatesRef = useRef([]);
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  // Cleanup for viewer connection
  const cleanupViewerConnection = useCallback(() => {
    if (viewerPeerConnectionRef.current) {
      try {
        viewerPeerConnectionRef.current.close();
      } catch (e) {}
      viewerPeerConnectionRef.current = null;
    }
    viewerPendingCandidatesRef.current = [];
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }
    setIsConnectingStream(false);
  }, []);

  // Stop broadcasting as streamer
  const stopStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }

    streamerPeerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    streamerPeerConnectionsRef.current.clear();
    streamerPendingCandidatesRef.current.clear();

    if (roomCodeRef.current) {
      socket.emit("stream-stop", { roomCode: roomCodeRef.current });
    }

    setIsStreaming(false);
    setActiveStream(null);
    setViewers([]);
    setStreamError(null);
  }, []);

  // Start screen broadcasting
  const startStream = useCallback(async (options = {}) => {
    if (!roomCodeRef.current) {
      setStreamError("Join a room before starting a watch party stream.");
      return false;
    }

    setStreamError(null);

    // Capability check: does getDisplayMedia exist in this browser?
    const hasDisplayMedia =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function");

    if (!hasDisplayMedia) {
      const isMobile =
        typeof navigator !== "undefined" &&
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

      const errorMsg = isMobile
        ? "Screen sharing is not supported by mobile web browsers (it requires desktop Chrome/Edge/Firefox or HTTPS). You can share using your Camera instead!"
        : "Screen sharing is not supported in this browser or requires a secure (HTTPS) connection. You can share using your Camera instead!";

      setStreamError(errorMsg);
      return false;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "browser",
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      localStreamRef.current = mediaStream;
      setLocalStream(mediaStream);
      setIsStreaming(true);

      const videoTrack = mediaStream.getVideoTracks()[0];
      const hasAudio = mediaStream.getAudioTracks().length > 0;

      // Handle browser's native "Stop sharing" bar
      if (videoTrack) {
        videoTrack.onended = () => {
          stopStream();
        };
      }

      const streamMetadata = {
        roomCode: roomCodeRef.current,
        streamTitle: options.streamTitle || `${profile.username || "Host"}'s Movie Stream`,
        hasAudio,
        username: profile.username || "Host"
      };

      socket.emit("stream-start", streamMetadata);
      return true;

    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
      if (err.name === "NotAllowedError" || err.message?.toLowerCase().includes("permission denied")) {
        // User cancelled the browser share picker - no error banner needed
        return false;
      }
      if (err.message && err.message.toLowerCase().includes("getdisplaymedia is not a function")) {
        setStreamError("Screen sharing is not supported on this mobile browser. Try sharing with Camera or using a desktop browser.");
      } else {
        setStreamError(err.message || "Failed to start screen share.");
      }
      return false;
    }
  }, [profile.username, stopStream]);

  // Start camera broadcasting (supported on mobile phones and desktop)
  const startCameraStream = useCallback(async (options = {}) => {
    if (!roomCodeRef.current) {
      setStreamError("Join a room before starting a watch party stream.");
      return false;
    }

    setStreamError(null);

    const hasUserMedia =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function");

    if (!hasUserMedia) {
      setStreamError("Camera and microphone are not supported in this browser or blocked by permissions.");
      return false;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode || "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      localStreamRef.current = mediaStream;
      setLocalStream(mediaStream);
      setIsStreaming(true);

      const videoTrack = mediaStream.getVideoTracks()[0];
      const hasAudio = mediaStream.getAudioTracks().length > 0;

      if (videoTrack) {
        videoTrack.onended = () => {
          stopStream();
        };
      }

      const streamMetadata = {
        roomCode: roomCodeRef.current,
        streamTitle: options.streamTitle || `${profile.username || "Host"}'s Live Camera`,
        hasAudio,
        username: profile.username || "Host"
      };

      socket.emit("stream-start", streamMetadata);
      return true;

    } catch (err) {
      console.warn("Camera stream error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStreamError("Camera & microphone permissions were denied. Please allow camera access in your browser settings.");
      } else {
        setStreamError(err.message || "Failed to start camera stream.");
      }
      return false;
    }
  }, [profile.username, stopStream]);

  // Request to join active stream as a viewer
  const joinStream = useCallback(() => {
    if (!roomCodeRef.current || !activeStream) return;
    cleanupViewerConnection();
    setIsConnectingStream(true);
    setStreamError(null);
    socket.emit("stream-join-viewer", {
      roomCode: roomCodeRef.current,
      username: profile.username || "Viewer"
    });
  }, [activeStream, profile.username, cleanupViewerConnection]);

  // Viewer leaves the stream
  const leaveStream = useCallback(() => {
    if (roomCodeRef.current) {
      socket.emit("stream-leave-viewer", { roomCode: roomCodeRef.current });
    }
    cleanupViewerConnection();
  }, [cleanupViewerConnection]);

  // Fetch active stream status whenever roomCode changes or joins
  useEffect(() => {
    if (!roomCode) {
      setActiveStream(null);
      if (isStreaming) stopStream();
      cleanupViewerConnection();
      return;
    }

    socket.emit("stream-get-status", { roomCode }, (res) => {
      if (res && res.activeStream) {
        setActiveStream(res.activeStream);
      } else {
        setActiveStream(null);
      }
    });

    function handleStatusResponse({ activeStream }) {
      setActiveStream(activeStream || null);
    }

    socket.on("stream-status-response", handleStatusResponse);
    return () => {
      socket.off("stream-status-response", handleStatusResponse);
    };
  }, [roomCode, isStreaming, stopStream, cleanupViewerConnection]);

  // Socket signaling listeners
  useEffect(() => {
    // Stream started in room
    function handleStreamStarted(streamInfo) {
      setActiveStream(streamInfo);
      if (streamInfo.streamerId !== socket.id) {
        // Automatically join as viewer if in room
        setIsConnectingStream(true);
        socket.emit("stream-join-viewer", {
          roomCode: roomCodeRef.current,
          username: profile.username || "Viewer"
        });
      }
    }

    // Stream stopped in room
    function handleStreamStopped() {
      setActiveStream(null);
      cleanupViewerConnection();
      if (isStreaming) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          localStreamRef.current = null;
          setLocalStream(null);
        }
        setIsStreaming(false);
      }
    }

    // Host receives request from a viewer
    async function handleViewerJoined({ viewerId, username }) {
      if (!localStreamRef.current) return;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      streamerPeerConnectionsRef.current.set(viewerId, pc);

      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("stream-ice-candidate", {
            targetId: viewerId,
            candidate: event.candidate
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
          pc.close();
          streamerPeerConnectionsRef.current.delete(viewerId);
          setViewers(prev => prev.filter(v => v.id !== viewerId));
        }
      };

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        });
        await pc.setLocalDescription(offer);

        socket.emit("stream-offer", {
          targetId: viewerId,
          offer
        });

        setViewers(prev => {
          if (prev.some(v => v.id === viewerId)) return prev;
          return [...prev, { id: viewerId, username }];
        });
      } catch (err) {
        console.error("Error creating stream offer for viewer:", err);
      }
    }

    // Host receives viewer departure
    function handleViewerLeft({ viewerId }) {
      const pc = streamerPeerConnectionsRef.current.get(viewerId);
      if (pc) {
        try {
          pc.close();
        } catch (e) {}
        streamerPeerConnectionsRef.current.delete(viewerId);
      }
      streamerPendingCandidatesRef.current.delete(viewerId);
      setViewers(prev => prev.filter(v => v.id !== viewerId));
    }

    // Viewer receives offer from Host
    async function handleStreamOffer({ from, offer }) {
      cleanupViewerConnection();

      const pc = new RTCPeerConnection(ICE_SERVERS);
      viewerPeerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setRemoteStream(event.streams[0]);
          setIsConnectingStream(false);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("stream-ice-candidate", {
            targetId: from,
            candidate: event.candidate
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          cleanupViewerConnection();
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain pending ICE candidates
        const pending = viewerPendingCandidatesRef.current;
        while (pending.length > 0) {
          const cand = pending.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("stream-answer", {
          targetId: from,
          answer
        });
      } catch (err) {
        console.error("Error handling stream offer:", err);
        setIsConnectingStream(false);
      }
    }

    // Host receives answer from Viewer
    async function handleStreamAnswer({ from, answer }) {
      const pc = streamerPeerConnectionsRef.current.get(from);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        const pending = streamerPendingCandidatesRef.current.get(from) || [];
        while (pending.length > 0) {
          const cand = pending.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {}
        }
      } catch (err) {
        console.error("Error setting stream remote description on host:", err);
      }
    }

    // ICE Candidate exchange
    async function handleStreamIceCandidate({ from, candidate }) {
      if (isStreaming) {
        const pc = streamerPeerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {}
        } else {
          if (!streamerPendingCandidatesRef.current.has(from)) {
            streamerPendingCandidatesRef.current.set(from, []);
          }
          streamerPendingCandidatesRef.current.get(from).push(candidate);
        }
      } else {
        const pc = viewerPeerConnectionRef.current;
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {}
        } else {
          viewerPendingCandidatesRef.current.push(candidate);
        }
      }
    }

    socket.on("stream-started", handleStreamStarted);
    socket.on("stream-stopped", handleStreamStopped);
    socket.on("stream-viewer-joined", handleViewerJoined);
    socket.on("stream-viewer-left", handleViewerLeft);
    socket.on("stream-offer", handleStreamOffer);
    socket.on("stream-answer", handleStreamAnswer);
    socket.on("stream-ice-candidate", handleStreamIceCandidate);

    return () => {
      socket.off("stream-started", handleStreamStarted);
      socket.off("stream-stopped", handleStreamStopped);
      socket.off("stream-viewer-joined", handleViewerJoined);
      socket.off("stream-viewer-left", handleViewerLeft);
      socket.off("stream-offer", handleStreamOffer);
      socket.off("stream-answer", handleStreamAnswer);
      socket.off("stream-ice-candidate", handleStreamIceCandidate);
    };
  }, [profile.username, isStreaming, cleanupViewerConnection]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStream();
      cleanupViewerConnection();
    };
  }, [stopStream, cleanupViewerConnection]);

  const isDisplayMediaSupported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function");

  return (
    <StreamContext.Provider
      value={{
        isStreaming,
        activeStream,
        streamError,
        setStreamError,
        isConnectingStream,
        viewers,
        localStream,
        remoteStream,
        streamVolume,
        setStreamVolume,
        isStreamMuted,
        setIsStreamMuted,
        startStream,
        startCameraStream,
        stopStream,
        joinStream,
        leaveStream,
        isDisplayMediaSupported
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}
