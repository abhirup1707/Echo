import { useContext, useState } from "react";
import { ProfileContext } from "../context/ProfileContext";

function Welcome() {

    const [name, setName] = useState("");

    const { profile, setProfile } = useContext(ProfileContext);

    function continueApp() {

        if (!name.trim()) return;

        setProfile({

            ...profile,

            username: name

        });

    }

    return (

        <div
            style={{

                height: "100vh",

                display: "flex",

                justifyContent: "center",

                alignItems: "center",

                background: "#09090f",

                color: "white"

            }}
        >

            <div
                style={{

                    width: "420px",

                    padding: "45px",

                    borderRadius: "18px",

                    background: "#18181f",

                    textAlign: "center"

                }}
            >

                <h1>🎵 Echo</h1>

                <p>

                    Listen Together

                </p>

                <br/>

                <input

                    placeholder="What should we call you?"

                    value={name}

                    onChange={(e)=>setName(e.target.value)}

                    style={{

                        width:"100%",

                        padding:"14px",

                        borderRadius:"12px",

                        border:"none",

                        background:"#26262f",

                        color:"white"

                    }}

                />

                <br/><br/>

                <button

                    onClick={continueApp}

                    style={{

                        width:"100%",

                        padding:"14px",

                        border:"none",

                        borderRadius:"12px",

                        background:"#7c3aed",

                        color:"white",

                        cursor:"pointer"

                    }}

                >

                    Continue

                </button>

            </div>

        </div>

    );

}

export default Welcome;