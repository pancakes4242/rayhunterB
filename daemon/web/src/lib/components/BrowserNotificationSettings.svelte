<script lang="ts">
    import { onMount } from 'svelte';
    import {
        initBrowserNotifications,
        getSettings,
        getPermission,
        getIsSupported,
        getSupportStatusMessage,
        setEnabled,
        setSoundEnabled,
        sendTestNotification,
        requestPermission,
        type NotificationPermissionState,
        type BrowserNotificationSettings,
    } from '../browserNotifications.svelte';

    let settings = $state<BrowserNotificationSettings>({ enabled: false, soundEnabled: true });
    let permissionState = $state<NotificationPermissionState>('default');
    let isSupported = $state(false);
    let statusMessage = $state('');
    let testMessage = $state('');
    let testMessageType = $state<'success' | 'error' | null>(null);
    let isRequestingPermission = $state(false);
    let initialized = $state(false);

    onMount(async () => {
        await initBrowserNotifications();
        settings = getSettings();
        permissionState = getPermission();
        isSupported = getIsSupported();
        statusMessage = getSupportStatusMessage();
        initialized = true;
    });

    async function handleEnableChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const enabled = target.checked;

        if (enabled && permissionState === 'default') {
            isRequestingPermission = true;
            const result = await requestPermission();
            isRequestingPermission = false;
            permissionState = result;

            if (result !== 'granted') {
                target.checked = false;
                statusMessage = getSupportStatusMessage();
                return;
            }
        }

        const success = await setEnabled(enabled);
        if (!success) {
            target.checked = false;
            statusMessage = getSupportStatusMessage();
        } else {
            settings = getSettings();
            statusMessage = getSupportStatusMessage();
        }
    }

    function handleSoundChange(event: Event) {
        const target = event.target as HTMLInputElement;
        setSoundEnabled(target.checked);
        settings = getSettings();
    }

    function handleTestNotification() {
        const success = sendTestNotification();
        if (success || settings.soundEnabled) {
            testMessage = success
                ? 'Test notification sent!'
                : 'Sound played (notification may be blocked)';
            testMessageType = success ? 'success' : 'error';
        } else {
            testMessage = 'Could not send notification. Check browser permissions.';
            testMessageType = 'error';
        }

        // Clear message after 3 seconds
        setTimeout(() => {
            testMessage = '';
            testMessageType = null;
        }, 3000);
    }

    function getPermissionBadgeClass(state: NotificationPermissionState): string {
        switch (state) {
            case 'granted':
                return 'bg-green-100 text-green-800';
            case 'denied':
                return 'bg-red-100 text-red-800';
            case 'unsupported':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    }

    function getPermissionLabel(state: NotificationPermissionState): string {
        switch (state) {
            case 'granted':
                return 'Allowed';
            case 'denied':
                return 'Blocked';
            case 'unsupported':
                return 'Unsupported';
            default:
                return 'Not requested';
        }
    }
</script>

<div class="border-t pt-4 mt-6 space-y-3">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Browser Notification Settings</h3>

    <p class="text-sm text-gray-600 mb-4">
        Receive audio and visual alerts in your browser when suspicious activity is detected. Works
        over local WiFi without requiring a cellular data plan.
    </p>

    {#if !initialized}
        <div class="text-center py-4">Loading notification settings...</div>
    {:else}
        <div class="space-y-4">
            <!-- Permission Status -->
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Permission Status</span>
                <span
                    class="px-2 py-1 rounded-full text-xs font-medium {getPermissionBadgeClass(
                        permissionState
                    )}"
                >
                    {getPermissionLabel(permissionState)}
                </span>
            </div>

            <!-- Status Message -->
            {#if statusMessage}
                <div
                    class="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800"
                >
                    <div class="flex items-start gap-2">
                        <svg
                            class="w-5 h-5 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <span>{statusMessage}</span>
                    </div>
                </div>
            {/if}

            <!-- Enable Toggle -->
            <div class="flex items-center">
                <input
                    id="browser_notifications_enabled"
                    type="checkbox"
                    checked={settings.enabled}
                    onchange={handleEnableChange}
                    disabled={!isSupported ||
                        permissionState === 'denied' ||
                        isRequestingPermission}
                    class="h-4 w-4 text-rayhunter-blue focus:ring-rayhunter-blue border-gray-300 rounded disabled:opacity-50"
                />
                <label for="browser_notifications_enabled" class="ml-2 block text-sm text-gray-700">
                    {#if isRequestingPermission}
                        Requesting permission...
                    {:else}
                        Enable browser notifications for warnings
                    {/if}
                </label>
            </div>

            <!-- Sound Toggle -->
            <div class="flex items-center">
                <input
                    id="browser_notifications_sound"
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onchange={handleSoundChange}
                    class="h-4 w-4 text-rayhunter-blue focus:ring-rayhunter-blue border-gray-300 rounded"
                />
                <label for="browser_notifications_sound" class="ml-2 block text-sm text-gray-700">
                    Play alert sound with notifications
                </label>
            </div>

            <!-- Test Button -->
            <div>
                <button
                    type="button"
                    onclick={handleTestNotification}
                    disabled={!isSupported && !settings.soundEnabled}
                    class="bg-rayhunter-blue hover:bg-rayhunter-dark-blue disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md flex flex-row gap-1 items-center"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        ></path>
                    </svg>
                    Test Browser Notification
                </button>
                {#if testMessage}
                    <div
                        class="mt-2 p-2 rounded text-sm {testMessageType === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'}"
                    >
                        {testMessage}
                    </div>
                {/if}
            </div>

            <!-- Info Box -->
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                <div class="flex items-start gap-2">
                    <svg
                        class="w-5 h-5 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <div>
                        <strong>Note:</strong> Browser notifications only work when this tab is open
                        and visible. For background notifications, consider using ntfy (see below).
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
