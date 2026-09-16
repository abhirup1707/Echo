import { useState, useRef, useEffect } from "react";
import { AVATAR_PRESETS } from "../../utils/avatars";
import UserAvatar from "../common/UserAvatar";
import "./AvatarModal.css";

export default function AvatarModal({ isOpen = true, currentAvatar, username, onClose, onSave }) {
    const [previewAvatar, setPreviewAvatar] = useState(currentAvatar || "");
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    // Sync preview with current avatar when opened or prop changes
    useEffect(() => {
        setPreviewAvatar(currentAvatar || "");
    }, [currentAvatar, isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        function handleKeyDown(e) {
            if (e.key === "Escape") {
                onClose?.();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_DIM = 256;
                let w = img.width;
                let h = img.height;

                if (w > h) {
                    if (w > MAX_DIM) {
                        h = Math.round((h * MAX_DIM) / w);
                        w = MAX_DIM;
                    }
                } else {
                    if (h > MAX_DIM) {
                        w = Math.round((w * MAX_DIM) / h);
                        h = MAX_DIM;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                setPreviewAvatar(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function handleSave() {
        if (typeof onSave === "function") {
            onSave(previewAvatar);
        }
        if (typeof onClose === "function") {
            onClose();
        }
    }

    return (
        <div className="avatar-modal-backdrop" onClick={onClose}>
            <div className="avatar-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="avatar-modal-header">
                    <h2>Choose Your Avatar</h2>
                    <button className="avatar-modal-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Current Preview */}
                <div className="avatar-preview-section">
                    <UserAvatar avatar={previewAvatar} username={username} size={64} />
                    <div className="avatar-preview-info">
                        <strong>{username || "Your Profile"}</strong>
                        <span>
                            {previewAvatar
                                ? previewAvatar.startsWith("data:")
                                    ? "Custom Photo Selected"
                                    : "Preset Avatar Selected"
                                : "Default Initials"}
                        </span>
                    </div>
                </div>

                {/* Camera and Album Upload Buttons */}
                <div className="avatar-upload-row">
                    <button
                        className="avatar-action-btn camera-btn"
                        onClick={() => cameraInputRef.current?.click()}
                        title="Take a selfie or capture a photo"
                    >
                        📸 Take Photo (Camera)
                    </button>
                    <button
                        className="avatar-action-btn"
                        onClick={() => galleryInputRef.current?.click()}
                        title="Pick an image from photo library"
                    >
                        📁 Choose from Album
                    </button>

                    {/* Hidden Native File Inputs */}
                    <input
                        type="file"
                        ref={cameraInputRef}
                        accept="image/*"
                        capture="user"
                        style={{ display: "none" }}
                        onChange={handleFile}
                    />
                    <input
                        type="file"
                        ref={galleryInputRef}
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFile}
                    />
                </div>

                {/* Preset Avatars Grid */}
                <div className="avatar-presets-title">
                    Or select an Echo Avatar:
                </div>
                <div className="avatar-presets-grid">
                    {AVATAR_PRESETS.map(preset => {
                        const isSelected = previewAvatar === preset.id;
                        return (
                            <div
                                key={preset.id}
                                className={`avatar-preset-item ${isSelected ? "selected" : ""}`}
                                onClick={() => setPreviewAvatar(preset.id)}
                            >
                                <div
                                    className="avatar-preset-icon-wrap"
                                    style={{ background: preset.gradient }}
                                >
                                    {preset.icon}
                                </div>
                                <span className="avatar-preset-label">{preset.name}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Controls */}
                <div className="avatar-modal-footer">
                    <button
                        className="avatar-reset-btn"
                        onClick={() => setPreviewAvatar("")}
                    >
                        Reset to Initials
                    </button>
                    <button
                        className="avatar-save-btn"
                        onClick={handleSave}
                    >
                        Save Avatar
                    </button>
                </div>
            </div>
        </div>
    );
}
