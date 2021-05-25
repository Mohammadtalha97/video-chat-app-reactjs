import { createContext, useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { io } from 'socket.io-client';

//Peer : simplifies WebRTC peer-to-peer data, video, and audio calls.
//context
const SocketContext = createContext();

//socket
const socket = io('http://localhost:3000');



const ContextProvider = ({ children }) => {

    //state
    const [stream, setStream] = useState(null);
    const [me, setMe] = useState('');
    const [call, setCall] = useState({});
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState('')

    //reference
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        //asking permission from user and setting stream to local variable
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentSteram) => {
                setStream(currentSteram);
                myVideo.current.srcObject = currentSteram;
            })
            .catch(err => {
                console.log(err.name);
            })

        //socket
        //getting id from backend
        socket.on('me', (id) => setMe(id));
        socket.on('calluser', ({ from, name: callerName, signal }) => {
            setCall({
                isReceivedCall: true,
                from,
                name: callerName,
                signal
            })
        })
    }, [])


    const answerCall = () => {
        setCallAccepted(true);

        const peer = new Peer({
            //we are answering call that's why false
            initiator: false,
            //for video stram 
            stream,// we have asked permission from user
            trickle: false,
        })

        //peer behave simillar to socket it hase action and handler which call when we call someone
        //once we receive signal - data : data about signal
        peer.on('signal', (data) => {
            //establishing video connection
            socket.emit('answercall', {
                signal: data,
                to: call.from //to whom we answering
            })
        })

        //other person stream
        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream
        })

        // 
        peer.signal(call.signal);
        // current connection is current peer inside this connection
        connectionRef.current = peer;

    }

    const callUser = (ID) => {
        //initiator : true we are calling that's why
        const peer = new Peer({ initiator: true, stream, trickle: false })

        peer.on('signal', (data) => {
            //establishing video connection
            socket.emit('calluser', {
                userToCall: ID,
                signalData: data,
                from: me, // i am calling so -> me,
                name //my name
            })
        })

        //other person stream
        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream
        })

        socket.on('callaccepted', (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;


    }

    const leaveCall = () => {
        setCallEnded(true);
        //stop receiving audio and video from user
        connectionRef.current.destroy();

        window.location.reload();
    }

    return (
        <SocketContext.Provider value={{
            call, callAccepted, callEnded, myVideo, userVideo, stream, name, me, setName, answerCall, callUser, leaveCall
        }}>
            {children}
        </SocketContext.Provider>
    )
}

export { ContextProvider, SocketContext };
