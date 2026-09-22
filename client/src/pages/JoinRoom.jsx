import { useEffect, useContext, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProfileContext } from "../context/ProfileContext";
import { SessionContext } from "../context/SessionContext";
import socket from "../socket";

export default function JoinRoom() {
    const { roomCode } = useParams();
    const { profile } = useContext(ProfileContext);
    const { setRoomCode: setSessionRoomCode, setUsername: setSessionUsername } = useContext(SessionContext);
    const navigate = useNavigate();
    const hasJoinedRef = useRef(false);

    useEffect(() => {
        if (!roomCode) {
            navigate("/room", { replace: true });
            return;
        }

        const cleanCode = roomCode.trim().toUpperCase();

        if (hasJoinedRef.current) return;
        hasJoinedRef.current = true;

        sessionStorage.setItem("echo_auto_join_room", cleanCode);
        sessionStorage.setItem("echoRoomCode", cleanCode);

        // If user already has a profile name, auto-join immediately
        if (profile?.username) {
            console.log("⚡ Auto-joining room with profile:", profile.username, cleanCode);
            socket.emit("join-session", {
                roomCode: cleanCode,
                username: profile.username,
                avatar: profile.avatar || ""
            });
            setSessionRoomCode(cleanCode);
            setSessionUsername(profile.username);
        }

        navigate("/room", { replace: true });
    }, [roomCode, profile?.username]);

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                background: "#0d0d15",
                color: "white",
                gap: "16px"
            }}
        >
            <div
                style={{
                    width: "44px",
                    height: "44px",
                    border: "3px solid rgba(124, 58, 237, 0.25)",
                    borderTopColor: "#7c3aed",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                }}
            />
            <div style={{ fontSize: "20px", fontWeight: "700" }}>
                Entering Room #{roomCode?.toUpperCase()}...
            </div>
            <div style={{ color: "#9ca3af", fontSize: "14px" }}>
                Connecting you to the session...
            </div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}