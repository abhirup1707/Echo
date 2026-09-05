import { createContext, useEffect, useState } from "react";

export const ProfileContext = createContext();

export default function ProfileProvider({ children }) {

    const [profile, setProfile] = useState(() => {
        const saved = localStorage.getItem("echo-profile");
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                avatar: "",
                ...parsed
            };
        }
        return {
            username: "",
            avatar: "",
            songsPlayed: 0,
            songsQueued: 0,
            sessionsJoined: 0,
            recentSongs: [],
            lastRoom: "",
            favoriteArtist: ""
        };
    });

    useEffect(() => {

        localStorage.setItem(

            "echo-profile",

            JSON.stringify(profile)

        );

    }, [profile]);

    return (

        <ProfileContext.Provider

value={{

    profile,

    setProfile,

    playSong(song){

        setProfile(prev=>{

            const recent=[

                song,

                ...prev.recentSongs.filter(

                    s=>s.videoId!==song.videoId

                )

            ].slice(0,10);

            const artists={};

            recent.forEach(s=>{

                artists[s.artist]=(artists[s.artist]||0)+1;

            });

            let favoriteArtist="";

            let max=0;

            Object.keys(artists).forEach(a=>{

                if(artists[a]>max){

                    max=artists[a];

                    favoriteArtist=a;

                }

            });

            return{

                ...prev,

                songsPlayed:prev.songsPlayed+1,

                recentSongs:recent,

                favoriteArtist

            };

        });

    },

    queueSong(){

        setProfile(prev=>({

            ...prev,

            songsQueued:prev.songsQueued+1

        }));

    },

    joinSession(room){

        setProfile(prev=>({

            ...prev,

            sessionsJoined:prev.sessionsJoined+1,

            lastRoom:room
        }));
    },

    updateAvatar(avatar){
        setProfile(prev=>({
            ...prev,
            avatar
        }));
    }
}}

        >

            {children}

        </ProfileContext.Provider>

    );

}