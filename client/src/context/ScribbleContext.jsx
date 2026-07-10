import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback
} from "react";

import socket from "../socket";

import {
    SessionContext
} from "./SessionContext";

import {
    ProfileContext
} from "./ProfileContext";


export const ScribbleContext =
    createContext(null);


export function ScribbleProvider({
    children
}) {

    const {
        roomCode
    } = useContext(SessionContext);

    const {
        profile
    } = useContext(ProfileContext);

    const [
        scribbleRoom,
        setScribbleRoom
    ] = useState(null);

    const [
        joined,
        setJoined
    ] = useState(false);


    const joinScribble = useCallback(() => {

        if (!roomCode) return;

        if (!profile?.username) return;

        socket.emit(
            "scribble-join",
            {

                roomCode,

                username:
                    profile.username

            }
        );

    }, [
        roomCode,
        profile?.username
    ]);


    const leaveScribble =
        useCallback(() => {

            if (!roomCode) return;

            socket.emit(
                "scribble-leave",
                {
                    roomCode
                }
            );

            setJoined(false);

            setScribbleRoom(null);

        }, [roomCode]);


    useEffect(() => {

        function handleRoom(room) {

            console.log(
                "🎨 Scribble room updated:",
                room
            );

            setScribbleRoom(room);

            setJoined(true);

        }


        function handleDisconnect() {

            setJoined(false);

        }


        function handleReconnect() {

            if (
                roomCode &&
                profile?.username
            ) {

                socket.emit(
                    "scribble-join",
                    {

                        roomCode,

                        username:
                            profile.username

                    }
                );

            }

        }


        socket.on(
            "scribble-room",
            handleRoom
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "connect",
            handleReconnect
        );


        return () => {

            socket.off(
                "scribble-room",
                handleRoom
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "connect",
                handleReconnect
            );

        };

    }, [
        roomCode,
        profile?.username
    ]);


    return (

        <ScribbleContext.Provider
            value={{

                scribbleRoom,

                joined,

                joinScribble,

                leaveScribble

            }}
        >

            {children}

        </ScribbleContext.Provider>

    );

}


export function useScribble() {

    const context =
        useContext(ScribbleContext);

    if (!context) {

        throw new Error(
            "useScribble must be used inside ScribbleProvider"
        );

    }

    return context;

}