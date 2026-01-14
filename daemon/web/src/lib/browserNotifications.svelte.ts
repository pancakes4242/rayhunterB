/**
 * Browser Notifications Module for Rayhunter
 *
 * Provides browser notification support for warning alerts over local WiFi.
 * Gracefully degrades when APIs are unavailable (e.g., non-secure context).
 */

const STORAGE_KEY = 'rayhunter_browser_notifications';
const NOTIFICATION_SOUND_DURATION = 500;

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface BrowserNotificationSettings {
    enabled: boolean;
    soundEnabled: boolean;
}

interface NotificationState {
    settings: BrowserNotificationSettings;
    permissionState: NotificationPermissionState;
    serviceWorkerRegistered: boolean;
    notifiedEntries: Set<string>;
}

const defaultSettings: BrowserNotificationSettings = {
    enabled: false,
    soundEnabled: true,
};

// Module-level state
const state: NotificationState = {
    settings: { ...defaultSettings },
    permissionState: 'default',
    serviceWorkerRegistered: false,
    notifiedEntries: new Set(),
};

// Reactive state exports using Svelte 5 runes
let _settings = $state<BrowserNotificationSettings>({ ...defaultSettings });
let _permissionState = $state<NotificationPermissionState>('default');
let _serviceWorkerRegistered = $state<boolean>(false);
let _isSupported = $state<boolean>(false);
let _isSecureContext = $state<boolean>(false);

/**
 * Check if the Notifications API is available
 */
export function isNotificationApiAvailable(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Check if we're in a secure context (required for some notification features)
 */
export function checkSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
}

/**
 * Get the current notification permission state
 */
export function getPermissionState(): NotificationPermissionState {
    if (!isNotificationApiAvailable()) {
        return 'unsupported';
    }
    return Notification.permission as NotificationPermissionState;
}

/**
 * Load settings from localStorage
 */
export function loadSettings(): BrowserNotificationSettings {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return { ...defaultSettings };
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                enabled:
                    typeof parsed.enabled === 'boolean' ? parsed.enabled : defaultSettings.enabled,
                soundEnabled:
                    typeof parsed.soundEnabled === 'boolean'
                        ? parsed.soundEnabled
                        : defaultSettings.soundEnabled,
            };
        }
    } catch (e) {
        console.warn('Failed to load browser notification settings:', e);
    }

    return { ...defaultSettings };
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: BrowserNotificationSettings): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        state.settings = { ...settings };
        _settings = { ...settings };
    } catch (e) {
        console.warn('Failed to save browser notification settings:', e);
    }
}

/**
 * Request notification permission from the user
 */
export async function requestPermission(): Promise<NotificationPermissionState> {
    if (!isNotificationApiAvailable()) {
        return 'unsupported';
    }

    try {
        const permission = await Notification.requestPermission();
        _permissionState = permission as NotificationPermissionState;
        state.permissionState = permission as NotificationPermissionState;
        return permission as NotificationPermissionState;
    } catch (e) {
        console.warn('Failed to request notification permission:', e);
        return 'denied';
    }
}

/**
 * Register the service worker for notifications (best-effort)
 */
export async function registerServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return false;
    }

    // Service workers require secure context
    if (!window.isSecureContext) {
        console.log('Service Worker requires secure context (HTTPS or localhost)');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        console.log('Service Worker registered:', registration.scope);
        _serviceWorkerRegistered = true;
        state.serviceWorkerRegistered = true;
        return true;
    } catch (e) {
        console.warn('Service Worker registration failed:', e);
        return false;
    }
}

/**
 * Play a notification sound using Web Audio API
 */
export function playNotificationSound(): void {
    if (typeof window === 'undefined' || !state.settings.soundEnabled) {
        return;
    }

    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Warning sound: two-tone alert
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + NOTIFICATION_SOUND_DURATION / 1000);
    } catch (e) {
        console.warn('Failed to play notification sound:', e);
    }
}

/**
 * Trigger device vibration if available
 */
export function vibrate(): void {
    if (typeof window === 'undefined' || !('vibrate' in navigator)) {
        return;
    }

    try {
        navigator.vibrate([200, 100, 200]);
    } catch {
        // Vibration may be blocked by browser policy
    }
}

/**
 * Send a browser notification
 */
export function sendNotification(title: string, body: string, tag?: string): boolean {
    if (!isNotificationApiAvailable()) {
        return false;
    }

    if (Notification.permission !== 'granted') {
        return false;
    }

    try {
        const notification = new Notification(title, {
            body,
            icon: '/rayhunter_orca_only.png',
            tag: tag || 'rayhunter-warning',
            requireInteraction: true,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Play sound and vibrate
        if (state.settings.soundEnabled) {
            playNotificationSound();
            vibrate();
        }

        return true;
    } catch (e) {
        console.warn('Failed to send notification:', e);
        return false;
    }
}

/**
 * Send a test notification to verify setup
 */
export function sendTestNotification(): boolean {
    // Always play sound for test, even if notification fails
    if (state.settings.soundEnabled) {
        playNotificationSound();
        vibrate();
    }

    return sendNotification(
        'Rayhunter Test',
        'Browser notifications are working!',
        'rayhunter-test'
    );
}

/**
 * Check if a manifest entry should trigger a notification
 * (warning count transitioned from 0 to >0)
 */
export function shouldNotifyForEntry(entryName: string, warningCount: number | undefined): boolean {
    if (!state.settings.enabled) {
        return false;
    }

    // No warnings or undefined
    if (warningCount === undefined || warningCount === 0) {
        // Reset tracking for this entry if warning count is now 0
        state.notifiedEntries.delete(entryName);
        return false;
    }

    // Already notified for this entry
    if (state.notifiedEntries.has(entryName)) {
        return false;
    }

    return true;
}

/**
 * Mark an entry as notified (for debouncing)
 */
export function markEntryNotified(entryName: string): void {
    state.notifiedEntries.add(entryName);
}

/**
 * Notify for a warning detection
 */
export function notifyWarningDetected(entryName: string, warningCount: number): boolean {
    if (!shouldNotifyForEntry(entryName, warningCount)) {
        return false;
    }

    markEntryNotified(entryName);

    const title = 'Rayhunter Warning';
    const body = `${warningCount} suspicious activity warning${warningCount > 1 ? 's' : ''} detected`;
    const tag = `rayhunter-warning-${entryName}`;

    return sendNotification(title, body, tag);
}

/**
 * Initialize the notification system
 * Should be called from onMount() in a Svelte component
 */
export async function initBrowserNotifications(): Promise<void> {
    if (typeof window === 'undefined') {
        return;
    }

    // Load settings from localStorage
    const loaded = loadSettings();
    state.settings = loaded;
    _settings = { ...loaded };

    // Check feature support
    _isSupported = isNotificationApiAvailable();
    _isSecureContext = checkSecureContext();
    _permissionState = getPermissionState();
    state.permissionState = _permissionState;

    // Try to register service worker (best-effort, may fail on HTTP)
    await registerServiceWorker();
}

/**
 * Get current settings (reactive)
 */
export function getSettings(): BrowserNotificationSettings {
    return _settings;
}

/**
 * Get permission state (reactive)
 */
export function getPermission(): NotificationPermissionState {
    return _permissionState;
}

/**
 * Check if notifications are supported
 */
export function getIsSupported(): boolean {
    return _isSupported;
}

/**
 * Check if we're in a secure context
 */
export function getIsSecureContext(): boolean {
    return _isSecureContext;
}

/**
 * Check if service worker is registered
 */
export function getServiceWorkerRegistered(): boolean {
    return _serviceWorkerRegistered;
}

/**
 * Enable or disable browser notifications
 */
export async function setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled && !isNotificationApiAvailable()) {
        return false;
    }

    if (enabled && Notification.permission === 'default') {
        const permission = await requestPermission();
        if (permission !== 'granted') {
            return false;
        }
    }

    if (enabled && Notification.permission === 'denied') {
        return false;
    }

    const newSettings = { ...state.settings, enabled };
    saveSettings(newSettings);
    return true;
}

/**
 * Enable or disable notification sound
 */
export function setSoundEnabled(soundEnabled: boolean): void {
    const newSettings = { ...state.settings, soundEnabled };
    saveSettings(newSettings);
}

/**
 * Get a user-friendly message about notification support status
 */
export function getSupportStatusMessage(): string {
    if (!isNotificationApiAvailable()) {
        return 'Browser notifications are not supported in this browser.';
    }

    if (!checkSecureContext()) {
        return (
            'Browser notifications require a secure connection (HTTPS). ' +
            'Some features may not work over HTTP.'
        );
    }

    const permission = getPermissionState();
    if (permission === 'denied') {
        return (
            'Notification permission was denied. ' +
            'Please enable notifications in your browser settings.'
        );
    }

    return '';
}
