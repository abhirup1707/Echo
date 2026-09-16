import { useState, useEffect } from "react";

let globalDeferredPrompt = null;

export function useBraveAndPwa() {
    const [isBrave, setIsBrave] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [canInstall, setCanInstall] = useState(!!globalDeferredPrompt);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const ua = navigator.userAgent || "";
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const android = /Android/i.test(ua);
        const ios = /iPhone|iPad|iPod/i.test(ua);

        setIsMobile(mobile);
        setIsAndroid(android);
        setIsIOS(ios);

        // Check standalone / installed mode
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;
        setIsStandalone(standalone);

        // Check if running in Brave browser
        async function detectBrave() {
            if (navigator.brave && typeof navigator.brave.isBrave === "function") {
                try {
                    const braveResult = await navigator.brave.isBrave();
                    if (braveResult) {
                        setIsBrave(true);
                        return;
                    }
                } catch (e) {}
            }
            if (/Brave/i.test(ua)) {
                setIsBrave(true);
            }
        }
        detectBrave();

        // Listen for PWA installation prompt
        function handleBeforeInstallPrompt(e) {
            e.preventDefault();
            globalDeferredPrompt = e;
            setCanInstall(true);
        }

        function handleAppInstalled() {
            globalDeferredPrompt = null;
            setCanInstall(false);
            setIsStandalone(true);
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    async function promptInstall() {
        if (globalDeferredPrompt) {
            try {
                globalDeferredPrompt.prompt();
                const choiceResult = await globalDeferredPrompt.userChoice;
                if (choiceResult.outcome === "accepted") {
                    setCanInstall(false);
                    globalDeferredPrompt = null;
                    return true;
                }
            } catch (e) {
                console.warn("PWA install error:", e);
            }
        }
        return false;
    }

    function getBraveLaunchUrl() {
        if (typeof window === "undefined") return "https://brave.com/";

        if (isAndroid) {
            // Android Intent URL: directly opens in Brave if installed, or falls back to Google Play Store!
            const host = window.location.host;
            const path = window.location.pathname || "/";
            const search = window.location.search || "";
            return `intent://${host}${path}${search}#Intent;scheme=https;package=com.brave.browser;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.brave.browser;end`;
        }

        if (isIOS) {
            return "https://apps.apple.com/app/brave-private-web-browser/id1052879175";
        }

        return "https://brave.com/download/";
    }

    return {
        isBrave,
        isMobile,
        isAndroid,
        isIOS,
        isStandalone,
        canInstall,
        promptInstall,
        getBraveLaunchUrl
    };
}
