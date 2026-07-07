// import {
//     createContext,
//     useRef,
//     useState,
//     useEffect
// } from "react";


// export const WebRTCContext = createContext();

// export default function WebRTCProvider({ children }) {

//     // Local video element (host)
//     const localVideoRef = useRef(null);

//     // Remote video element (viewer)
//     const remoteVideoRef = useRef(null);

//     // Selected local file
//     const [videoFile, setVideoFile] = useState(null);

//     // Blob URL for local playback
//     const [videoURL, setVideoURL] = useState(null);

//     // MediaStream we'll send through WebRTC
//     const [localStream, setLocalStream] = useState(null);

//     // All connected peers
//     const [peers, setPeers] = useState([]);

  





//     return (

//         <WebRTCContext.Provider
//             value={{

//                 localVideoRef,
//                 remoteVideoRef,

//                 videoFile,
//                 setVideoFile,

//                 videoURL,
//                 setVideoURL,

//                 localStream,
//                 setLocalStream,

//                 peers,
//                 setPeers

//             }}
//         >

//             {children}

//         </WebRTCContext.Provider>

//     );

// }