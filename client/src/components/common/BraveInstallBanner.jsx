import { useState } from "react";
import { useBraveAndPwa } from "../../hooks/useBraveAndPwa";
import { FaTimes, FaDownload, FaExternalLinkAlt, FaInfoCircle } from "react-icons/fa";
import "./BraveInstallBanner.css";

export default function BraveInstallBanner() {
    const {
        isBrave,
        isMobile,
        isAndroid,
        isIOS,
        isStandalone,
        canInstall,
        promptInstall,
        getBraveLaunchUrl
    } = useBraveAndPwa();

    const [dismissed, setDismissed] = useState(() => {
        return sessionStorage.getItem("echo_brave_banner_dismissed") === "true";
    });
    const [showHelpModal, setShowHelpModal] = useState(false);

    // If already in installed shortcut app or user dismissed for this session, don't display
    if (isStandalone || dismissed) {
        return null;
    }

    function handleDismiss() {
        sessionStorage.setItem("echo_brave_banner_dismissed", "true");
        setDismissed(true);
    }

    async function handleInstallClick() {
        if (canInstall) {
            const installed = await promptInstall();
            if (installed) return;
        }
        setShowHelpModal(true);
    }

    return (
        <>
            <div className="brave-install-banner">
                <div className="bib-content">
                    <div className="bib-icon-wrap">
                        {isBrave ? (
                            <span className="bib-emoji">🦁</span>
                        ) : (
                            <span className="bib-emoji">🎧</span>
                        )}
                    </div>

                    <div className="bib-text-wrap">
                        <div className="bib-title-row">
                            <span className="bib-badge">
                                {isBrave ? "BRAVE READY" : "BACKGROUND AUDIO TIP"}
                            </span>
                            <strong className="bib-title">
                                {isBrave
                                    ? "Install Echo as a Background App"
                                    : "Want 24/7 Background Music on Mobile?"}
                            </strong>
                        </div>
                        <p className="bib-desc">
                            {isBrave
                                ? "You're in Brave! Install the Echo shortcut for one-tap home screen access & continuous playback."
                                : "Mobile Chrome pauses music when locked. Open in Brave Browser for uninterrupted background listening!"}
                        </p>
                    </div>

                    <div className="bib-actions">
                        {isBrave ? (
                            <button
                                className="bib-btn primary-btn"
                                onClick={handleInstallClick}
                            >
                                <FaDownload style={{ marginRight: 6 }} /> Install App
                            </button>
                        ) : (
                            <a
                                href={getBraveLaunchUrl()}
                                target="_blank"
                                rel="noreferrer"
                                className="bib-btn primary-btn"
                            >
                                <FaExternalLinkAlt style={{ marginRight: 6 }} />
                                {isAndroid ? "Open / Get Brave" : "Get Brave Browser"}
                            </a>
                        )}

                        <button
                            className="bib-btn close-btn"
                            onClick={handleDismiss}
                            title="Dismiss for this session"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            </div>

            {/* Manual Installation Help Modal */}
            {showHelpModal && (
                <div
                    className="bib-modal-overlay"
                    onClick={() => setShowHelpModal(false)}
                >
                    <div
                        className="bib-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bib-modal-header">
                            <h3>
                                <FaInfoCircle style={{ marginRight: 8, color: "#8b5cf6" }} />
                                Add Echo to Home Screen
                            </h3>
                            <button
                                className="bib-modal-close"
                                onClick={() => setShowHelpModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="bib-modal-body">
                            <p>
                                To install the <strong>Echo shortcut app</strong> on your phone:
                            </p>
                            <ol className="bib-steps-list">
                                <li>
                                    Tap the browser menu (<strong>⋮</strong> in Brave/Chrome on Android, or <strong>Share ⎋</strong> in Safari on iOS).
                                </li>
                                <li>
                                    Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                                </li>
                                <li>
                                    Open the new <strong>Echo</strong> icon from your home screen for full background music!
                                </li>
                            </ol>
                            {isBrave && (
                                <div className="bib-brave-tip">
                                    🦁 <strong>Brave Tip:</strong> In Brave, make sure to enable <em>Settings ➔ Background play</em> for 24/7 lock-screen audio!
                                </div>
                            )}
                        </div>
                        <button
                            className="bib-modal-action-btn"
                            onClick={() => setShowHelpModal(false)}
                        >
                            Got It!
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
