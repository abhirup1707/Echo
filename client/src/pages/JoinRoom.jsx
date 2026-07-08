import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function JoinRoom() {

    const { roomCode } = useParams();

    const navigate = useNavigate();

    useEffect(() => {

        sessionStorage.setItem("echoRoomCode", roomCode);

        navigate("/room");

    }, []);

    return (

        <div
            style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                fontSize: "24px"
            }}
        >

            Joining Room...

        </div>

    );

}