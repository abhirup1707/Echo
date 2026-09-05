import { useContext, useEffect, useRef, useState } from "react";
import { SessionContext } from "../../context/SessionContext";
import { ProfileContext } from "../../context/ProfileContext";
import UserAvatar from "../common/UserAvatar";
import "./ChatBox.css";

function ChatBox() {

    const {

        messages,

        sendMessage

    } = useContext(SessionContext);

    const { profile } = useContext(ProfileContext);

    const [text, setText] = useState("");

    const bottomRef = useRef(null);


    useEffect(() => {

        bottomRef.current?.scrollIntoView({

            behavior: "smooth"

        });

    }, [messages]);

    function handleSend() {

        sendMessage(text);

        setText("");

    }

    return (

        <div className="chat-box">

            <h2>

                💬 Session Chat

            </h2>

            <div className="chat-messages">

                {

messages.map((msg) => {

    const mine = msg.username === profile.username;

    return (

        <div

            key={msg.id}

            className={`chat-message ${mine ? "mine" : "other"}`}
        >
            {!mine && (
                <div className="chat-user-row">
                    <UserAvatar
                        avatar={msg.avatar}
                        username={msg.username}
                        size={20}
                    />
                    <strong className="chat-user">
                        {msg.username}
                    </strong>
                </div>
            )}

<p className="chat-text">

    {msg.message}

</p>

<small className="chat-time">

    {msg.time}

</small>

        </div>

    );

})

                }

                <div ref={bottomRef}/>

            </div>

            <div className="chat-input">

                <input

                    placeholder="Type a message..."

                    value={text}

                    onChange={(e)=>setText(e.target.value)}

                    onKeyDown={(e)=>{

                        if(e.key==="Enter"){

                            handleSend();

                        }

                    }}

                />

                <button

                    onClick={handleSend}

                >

                    Send

                </button>

            </div>

        </div>

    );

}

export default ChatBox;