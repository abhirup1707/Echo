import { getPresetById } from "../../utils/avatars";
import "./UserAvatar.css";

export default function UserAvatar({ avatar, username, size = 44, className = "" }) {
    const isCustomImage = avatar && (avatar.startsWith("data:image/") || avatar.startsWith("http://") || avatar.startsWith("https://"));
    const preset = avatar && avatar.startsWith("preset-") ? getPresetById(avatar) : null;
    const initial = username ? username.charAt(0).toUpperCase() : "?";

    const style = {
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.round(size * 0.44)}px`
    };

    return (
        <div className={`user-avatar-wrap ${className}`} style={style}>
            {isCustomImage ? (
                <img src={avatar} alt={username || "User"} className="user-avatar-img" />
            ) : preset ? (
                <div className="user-avatar-preset" style={{ background: preset.gradient }}>
                    <span>{preset.icon}</span>
                </div>
            ) : (
                <div className="user-avatar-initials">
                    <span>{initial}</span>
                </div>
            )}
        </div>
    );
}
