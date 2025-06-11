import React from 'react'
import "./SIPClient.css";


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

export default CallNotification