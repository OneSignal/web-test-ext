/**
 * Sets the site's notification permission setting.
 * @param siteUrl The match pattern URL for a website.
 * @param permission One of 'allow', 'block', 'ask', or 'clear'.
 */
function setNotificationPermission(siteUrl, permission) {
    return new Promise(resolve => {
        if (permission === 'clear') {
            chrome.contentSettings.notifications.clear({}, resolve);
        } else {
            chrome.contentSettings.notifications.set({
                'primaryPattern': siteUrl,
                'setting': permission
            }, resolve);
        }
    });
}

var COMMANDS = {
    SET_NOTIFICATION_PERMISSION: 'SET_NOTIFICATION_PERMISSION',
};

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log('OneSignal Ext: Received message:', request);
    if (request.command === COMMANDS.SET_NOTIFICATION_PERMISSION) {
        console.log('Setting notification permission.');
        setNotificationPermission(request.siteUrl, request.permission)
            .then(() => sendResponse({success: true}));
        return true;
    }
});

console.log('OneSignal Ext: Started up.');