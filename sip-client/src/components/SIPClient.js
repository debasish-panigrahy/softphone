import React, { useEffect, useRef, useState } from "react";
import JsSIP from "jssip";
import "./SIPClient.css";
import Dialpad from './Dialpad';

const CallNotification = ({ caller, onAccept, onReject }) => {
  return (
    <div className="call-notification-overlay">
      <div className="call-notification">
        <div className="call-ringing-animation">
          <div className="caller-avatar">
            📞
          </div>
        </div>
        <h2>Incoming Call</h2>
        <div className="caller-number">
          {caller}
        </div>
        <div className="call-notification-buttons">
          <button className="accept-button" onClick={onAccept}>
            ✓ Accept
          </button>
          <button className="reject-button" onClick={onReject}>
            ✕ Reject
          </button>
        </div>
      </div>
    </div>
  );
};

const SIPClient = () => {
  const [sipWS, setSipWS] = useState(() => localStorage.getItem("sipWS") || "ws://192.168.217.77:5066");
  const [sipURI, setSipURI] = useState(() => localStorage.getItem("sipURI") || "");
  const [sipPassword, setSipPassword] = useState(() => localStorage.getItem("sipPassword") || "");
  const [registered, setRegistered] = useState(false);
  const [started, setStarted] = useState(false);
  const [recipient, setRecipient] = useState("sip:1001@192.168.217.77");
  const [currentRecipient, setCurrentRecipient] = useState("sip:1001@192.168.217.77");
  const [callStatus, setCallStatus] = useState("Idle");
  const [wsStatus, setWsStatus] = useState("Disconnected");
  const [session, setSession] = useState(null);
  const [hasAudioDevice, setHasAudioDevice] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const remoteAudioRef = useRef();
  const uaRef = useRef(null);
  const sessionRef = useRef(null);
  const ringtoneRef = useRef(new Audio('/sounds/ring.mp3')); // Add this line
  const localAudioRef = useRef();

  useEffect(() => {
    if (!started) return;

    try {
      console.log("Initializing SIP with:", { sipWS, sipURI });
      const socket = new JsSIP.WebSocketInterface(sipWS);
      
      const configuration = {
        sockets: [socket],
        uri: sipURI,
        password: sipPassword,
        session_timers: false,
        register_expires: 30, // Add this line
        user_agent: 'My SIP Client', // Add this line for identification
      };

      const ua = new JsSIP.UA(configuration);
      uaRef.current = ua;

      // Add WebSocket connection handlers
      socket.onconnect = () => {
        console.log("WebSocket connected");
        setWsStatus("Connected");
      };

      socket.ondisconnect = () => {
        console.log("WebSocket disconnected");
        setWsStatus("Disconnected");
        setRegistered(false);
      };

      ua.on("registered", () => {
        console.log("SIP Registration successful");
        setRegistered(true);
      });

      ua.on("unregistered", () => {
        console.log("SIP Unregistered");
        setRegistered(false);
      });

      ua.on("registrationFailed", (error) => {
        console.error("Registration failed:", error);
        setRegistered(false);
      });

      // Update the newRTCSession event handler
      ua.on("newRTCSession", ({ originator, session }) => {
        console.log("New RTC Session", { originator });
        let isCallRejected = false;

        // Add stream handler
        session.on("addstream", (e) => {
          console.log("Remote stream added:", e.stream);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = e.stream;
            remoteAudioRef.current.play().catch(err => 
              console.error("Error playing audio:", err)
            );
          }
        });

        // Update the accepted handler
        session.on("accepted", () => {
          if (!isCallRejected) {
            console.log("Call accepted");
            setCallStatus("Connected");
            // Get local stream
            const localStream = session.connection.getLocalStreams()[0];
            if (localStream) {
              setLocalStream(localStream);
              if (localAudioRef.current) {
                localAudioRef.current.srcObject = localStream;
              }
            }
          }
        });

        session.on("rejected", (e) => {
          console.log("Call rejected:", e);
          isCallRejected = true;
          setCallStatus("Not Answered");
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
          }
          sessionRef.current = null;
          setSession(null);
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        });

        session.on("failed", (e) => {
          console.error("Call failed:", e);
          isCallRejected = true;
          setCallStatus(e.cause === 'Rejected' ? "Not Answered" : "Failed");
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
          }
          sessionRef.current = null;
          setSession(null);
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        });

        // Move accepted and confirmed handlers after rejected handler
        session.on("accepted", () => {
          // Only update if call hasn't been rejected
          if (!isCallRejected) {
            console.log("Call accepted - checking rejection status:", isCallRejected);
            setCallStatus("Connected");
          } else {
            console.log("Ignoring accepted event - call was rejected");
          }
        });

        session.on("confirmed", () => {
          // Only update if call hasn't been rejected
          if (!isCallRejected) {
            console.log("Call confirmed - checking rejection status:", isCallRejected);
            setCallStatus("Connected");
          } else {
            console.log("Ignoring confirmed event - call was rejected");
          }
        });

        // Add bye event handler
        session.on("bye", () => {
          console.log("Call ended by remote party");
          setCallStatus("Idle");
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
          }
          sessionRef.current = null;
          setSession(null);
        });

        // Update ended event handler
        session.on("ended", () => {
          console.log("Call ended");
          setCallStatus("Idle");
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
          }
          sessionRef.current = null;
          setSession(null);
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        });

        // Update failed event handler
        session.on("failed", (e) => {
          console.error("Call failed:", e);
          setCallStatus(e.cause === 'Rejected' ? "Not Answered" : "Failed");
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
          }
          sessionRef.current = null;
          setSession(null);
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        });

        // Remove any existing session before setting new one
        if (sessionRef.current) {
          sessionRef.current.terminate();
        }

        // Only set the session if call hasn't been rejected
        if (!isCallRejected) {
          sessionRef.current = session;
          setSession(session);
        }

        // Handle incoming calls
        if (originator === "remote") {
          const caller = session.remote_identity.uri.user;
          console.log("Incoming call from:", caller);
          setCallStatus("Incoming Call");
          ringtoneRef.current.play().catch(e => console.log('Error playing ringtone:', e));
        }
      });

      ua.start();

      localStorage.setItem("sipWS", sipWS);
      localStorage.setItem("sipURI", sipURI);
      localStorage.setItem("sipPassword", sipPassword);

      return () => {
        ua.stop();
        ua.removeAllListeners();
      };
    } catch (error) {
      console.error("SIP initialization error:", error);
    }
  }, [started, sipWS, sipURI, sipPassword]);

  useEffect(() => {
    const checkAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setHasAudioDevice(audioInputs.length > 0);
        setAudioError(null);
      } catch (error) {
        console.error('Error checking audio devices:', error);
        setHasAudioDevice(false);
        setAudioError(error.message);
      }
    };

    checkAudioDevices();
  }, []);

  // Add this function and call it when component mounts
  const requestAudioPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasAudioDevice(true);
      stream.getTracks().forEach(track => track.stop()); // Release the stream
    } catch (error) {
      console.error('Error getting audio permissions:', error);
      setHasAudioDevice(false);
      setAudioError(error.message);
    }
  };

  useEffect(() => {
    requestAudioPermissions();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStarted(true);
  };

  // Update the call function
  const call = (callRecipient) => {
    if (!uaRef.current || !registered) {
      console.log("Cannot make call - UA not ready or not registered");
      return;
    }

    try {
      const options = {
        mediaConstraints: { 
          audio: true,  // Always try to use audio
          video: false 
        },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        },
        eventHandlers: {
          trying: () => {
            console.log("Call trying...");
            setCallStatus("Trying");
          },
          progress: () => {
            console.log("Call in progress...");
            setCallStatus("Ringing");
          },
          rejected: (e) => {
            console.log("Call rejected with cause:", e.cause);
            setCallStatus("Not Answered");
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = null;
            }
            sessionRef.current = null;
            setSession(null);
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
          },
          failed: (e) => {
            console.error("Call failed with cause:", e.cause);
            // Handle rejection specifically
            if (e.cause === 'Rejected' || e.cause === 'Busy') {
              setCallStatus("Not Answered");
            } else {
              setCallStatus("Failed");
            }
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = null;
            }
            sessionRef.current = null;
            setSession(null);
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
          },
          confirmed: () => {
            // Only set Connected if the call hasn't been rejected
            if (sessionRef.current && callStatus !== "Not Answered") {
              console.log("Call confirmed");
              setCallStatus("Connected");
            }
          },
          ended: () => {
            console.log("Call ended");
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = null;
            }
            setCallStatus("Idle");
            sessionRef.current = null;
            setSession(null);
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
          },
          connecting: () => {
            console.log("Call connecting...");
            setCallStatus("Connecting");
          },
          peerconnection: (e) => {
            console.log("Peer connection created");
            const peerconnection = e.peerconnection;
            
            // Handle remote stream
            peerconnection.ontrack = (trackEvent) => {
              console.log("Remote track received:", trackEvent.streams[0]);
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = trackEvent.streams[0];
              }
            };
          }
        },
        pcConfig: {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] }
          ]
        }
      };

      const newSession = uaRef.current.call(callRecipient, options);
      setSession(newSession);
      sessionRef.current = newSession;
      setCallStatus("Calling");
    } catch (error) {
      console.error("Error making call:", error);
      setCallStatus("Failed");
    }
  };

  const hangup = () => {
    if (sessionRef.current) {
      try {
        sessionRef.current.terminate();
        setCallStatus("Idle");
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
        sessionRef.current = null;
        setSession(null);
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      } catch (error) {
        console.error("Error during hangup:", error);
      }
    }
  };

  const toggleMute = () => {
    if (sessionRef.current) {
      if (isMuted) {
        sessionRef.current.unmute();
      } else {
        sessionRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleHold = () => {
    if (sessionRef.current) {
      if (isOnHold) {
        sessionRef.current.unhold();
      } else {
        sessionRef.current.hold();
      }
      setIsOnHold(!isOnHold);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.setSinkId(isSpeakerOn ? 'default' : 'speaker')
        .then(() => {
          setIsSpeakerOn(!isSpeakerOn);
        })
        .catch(e => console.error('Error switching audio output:', e));
    }
  };

  const rejectCall = () => {
    if (sessionRef.current) {
      sessionRef.current.terminate({
        status_code: 486, // Busy Here
        reason_phrase: 'Busy Here'
      });
      setCallStatus("Idle");
      sessionRef.current = null;
      setSession(null);
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const handleDTMF = (digit) => {
    if (sessionRef.current && sessionRef.current.isEstablished()) {
      console.log('Sending DTMF:', digit);
      sessionRef.current.sendDTMF(digit);
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'connected':
        return 'status-connected';
      case 'connecting':
      case 'initiating call':
      case 'ringing':
        return 'status-calling';
      case 'incoming call':
        return 'status-incoming';
      case 'not answered':
        return 'status-not-answered';
      case 'call failed':
      case 'call ended':
        return 'status-failed';
      case 'idle':
        return 'status-idle';
      default:
        return 'status-idle';
    }
  };

  if (!started) {
    return (
      <div className="sip-container">
        <form className="sip-form" onSubmit={handleSubmit}>
          <h2>Connect to SIP Server</h2>
          <input
            placeholder="SIP WS URL (e.g., ws://192.168.217.68:5066)"
            value={sipWS}
            onChange={(e) => setSipWS(e.target.value)}
            required
          />
          <input
            placeholder="SIP URI (e.g., sip:1000@192.168.217.68)"
            value={sipURI}
            onChange={(e) => setSipURI(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="SIP Password"
            value={sipPassword}
            onChange={(e) => setSipPassword(e.target.value)}
            required
          />
          <button type="submit">Connect to SIP Server</button>
        </form>
      </div>
    );
  }

  const handleCall = (number) => {
    if (!uaRef.current || !registered) {
      console.log("Cannot make call - UA not ready or not registered");
      return;
    }

    const fullUri = `sip:${number}@192.168.217.77`; // Replace with your domain
    setRecipient(fullUri);
    call(fullUri);
  };

  // Add these console logs in appropriate places
  console.log('Remote audio element:', remoteAudioRef.current);
  console.log('Remote audio stream:', remoteAudioRef.current?.srcObject);
  console.log('Audio element playing:', !remoteAudioRef.current?.paused);

  return (
    <div className="sip-container">
      <h2>SIP Client</h2>
      
      <div className="status-container">
        <p>
          Connected as: <strong>{sipURI}</strong>
        </p>
        <p>
          Registration Status:{" "}
          <span className={registered ? "registered" : "not-registered"}>
            {registered ? "Registered" : "Not Registered"}
          </span>
        </p>
        <p>
          Call Status:{" "}
          <span className={`status-badge ${getStatusClass(callStatus)}`}>
            {callStatus}
          </span>
        </p>
        <p>
          Audio Device: {" "}
          <span className={hasAudioDevice ? "device-available" : "device-unavailable"}>
            {hasAudioDevice ? "Available" : "Not Available"}
          </span>
          {audioError && <span className="error-message">Error: {audioError}</span>}
        </p>
      </div>

      <div className="call-container">
        <h3>Make a Call</h3>
        <Dialpad 
          onCall={handleCall}
          onDigit={session ? handleDTMF : undefined}
          showDisplay={!session}
        />
        
        {session && callStatus === "Connected" && (
          <div className="call-controls">
            <button 
              className={`call-control-button mute ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
            >
              <span className="control-icon">
                {isMuted ? '🔇' : '🎤'}
              </span>
              <span className="control-label">
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>

            <button 
              className={`call-control-button speaker ${isSpeakerOn ? 'active' : ''}`}
              onClick={toggleSpeaker}
            >
              <span className="control-icon">
                {isSpeakerOn ? '🔊' : '🔉'}
              </span>
              <span className="control-label">
                {isSpeakerOn ? 'Speaker' : 'Earpiece'}
              </span>
            </button>

            <button 
              className={`call-control-button hold ${isOnHold ? 'active' : ''}`}
              onClick={toggleHold}
            >
              <span className="control-icon">
                {isOnHold ? '⏵' : '⏸'}
              </span>
              <span className="control-label">
                {isOnHold ? 'Resume' : 'Hold'}
              </span>
            </button>

            <button 
              className="call-control-button hangup"
              onClick={hangup}
            >
              <span className="control-icon">📞</span>
              <span className="control-label">End</span>
            </button>
          </div>
        )}

        <div className="audio-controls">
          <button 
            className={`mute-button ${isMuted ? 'muted' : ''}`}
            onClick={toggleMute}
            disabled={!session}
          >
            {isMuted ? '🔇 Unmute' : '🔊 Mute'}
          </button>
        </div>
      </div>

      {callStatus === "Incoming Call" && (
        <CallNotification 
          caller={sessionRef.current?.remote_identity.uri.user || 'Unknown'}
          onAccept={() => {
            if (sessionRef.current) {
              sessionRef.current.answer({
                mediaConstraints: { 
                  audio: true,
                  video: false 
                },
                rtcOfferConstraints: {
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: false
                },
                pcConfig: {
                  iceServers: [
                    { urls: ['stun:stun.l.google.com:19302'] }
                  ]
                }
              });
              console.log('Call answered with audio constraints');
            }
          }}
          onReject={rejectCall}
        />
      )}

      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline 
        style={{ display: 'none' }} 
      />
      <audio 
        ref={localAudioRef} 
        autoPlay 
        muted 
        playsInline 
        style={{ display: 'none' }} 
      />
    </div>
  );
};

export default SIPClient;
