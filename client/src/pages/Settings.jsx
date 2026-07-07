import { useContext, useState } from "react";
import { ProfileContext } from "../context/ProfileContext";
import "./Settings.css";

function Settings() {

    const { profile, setProfile } = useContext(ProfileContext);

    const [newName, setNewName] = useState(profile.username);

    function saveName() {

        if (!newName.trim()) return;

        setProfile({

            ...profile,

            username: newName.trim()

        });

        alert("Display name updated!");

    }

    function resetProfile() {

        const confirmReset = window.confirm(
            "This will erase your local profile and statistics. Continue?"
        );

        if (!confirmReset) return;

        localStorage.removeItem("echo-profile");

        window.location.reload();

    }

    return (

        <div className="settings-page">

            <h1>⚙ Settings</h1>

            <div className="settings-card">

                <h2>Display Name</h2>

                <p>
                    Change how your name appears in sessions.
                </p>

                <input

                    value={newName}

                    onChange={(e)=>setNewName(e.target.value)}

                    placeholder="Display Name"

                />

                <button onClick={saveName}>

                    Save Name

                </button>

            </div>

            <div className="settings-card danger">

                <h2>Developer Options</h2>

                <p>

                    Remove your local profile and restart Echo.

                </p>

                <button
                    className="reset-btn"
                    onClick={resetProfile}
                >

                    Reset Local Profile

                </button>

            </div>

        </div>

    );

}

export default Settings;