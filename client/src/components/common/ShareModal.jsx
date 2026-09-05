import { useState } from "react";
import { 
  FaTimes, 
  FaCopy, 
  FaCheck, 
  FaWhatsapp, 
  FaTelegramPlane, 
  FaShareAlt, 
  FaQrcode 
} from "react-icons/fa";
import "./ShareModal.css";

export default function ShareModal({ roomCode, onClose }) {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const inviteUrl = `${window.location.origin}/join/${roomCode}`;
  const shareMessage = `Join my Echo party room! Listen to music, watch videos, and play games with me in real-time:\n${inviteUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("Join my Echo party room! 🎧🎮")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Echo Room #${roomCode}`,
          text: "Join my Echo room! Listen to music, watch videos, and play games together in real-time.",
          url: inviteUrl
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  // QR code image via qrserver API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteUrl)}&color=ffffff&bgcolor=161622&margin=10`;

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-title">
            <span className="share-modal-icon">🎉</span>
            <h3>Invite Friends</h3>
          </div>
          <button 
            type="button" 
            className="share-modal-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Room Code Badge */}
        <div className="share-room-badge-wrap">
          <div className="share-room-badge">
            <span className="room-badge-lbl">ROOM CODE</span>
            <span className="room-badge-val">#{roomCode}</span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="share-qr-section">
          <div className="share-qr-frame">
            {!imgLoaded && <div className="share-qr-skeleton" />}
            <img 
              src={qrCodeUrl} 
              alt={`QR Code to join Room #${roomCode}`} 
              className={`share-qr-image ${imgLoaded ? "loaded" : ""}`}
              onLoad={() => setImgLoaded(true)}
            />
            <div className="share-qr-center-pill">
              <span>🎧 ECHO</span>
            </div>
          </div>
          <p className="share-qr-hint">
            <FaQrcode /> Scan with any phone camera to join instantly
          </p>
        </div>

        {/* Copy Link Input Bar */}
        <div className="share-link-box">
          <input 
            type="text" 
            readOnly 
            value={inviteUrl} 
            className="share-link-input"
            onClick={(e) => e.target.select()}
          />
          <button 
            type="button" 
            className={`share-copy-btn ${copied ? "copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? <FaCheck /> : <FaCopy />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="share-actions-grid">
          <button 
            type="button" 
            className="share-action-btn whatsapp-btn"
            onClick={handleWhatsApp}
          >
            <FaWhatsapp className="share-btn-icon" />
            <span>WhatsApp</span>
          </button>

          <button 
            type="button" 
            className="share-action-btn telegram-btn"
            onClick={handleTelegram}
          >
            <FaTelegramPlane className="share-btn-icon" />
            <span>Telegram</span>
          </button>

          {typeof navigator !== "undefined" && navigator.share && (
            <button 
              type="button" 
              className="share-action-btn native-share-btn"
              onClick={handleNativeShare}
            >
              <FaShareAlt className="share-btn-icon" />
              <span>More</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
