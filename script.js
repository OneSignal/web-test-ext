/**
 * Sets the site's popup permission setting.
 * @param siteUrl The match pattern URL for a website.
 * @param permission One of 'allow', 'block', or 'clear'.
 */
function setPopupPermission(siteUrl, permission) {
    return new Promise(resolve => {
        if (permission === 'clear') {
            chrome.contentSettings.popups.clear({}, resolve);
        } else {
            chrome.contentSettings.popups.set({
                'primaryPattern': siteUrl,
                'setting': permission
            }, resolve);
        }
    });
}

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

/**
 * Creates a new Chrome browser tab.
 * @param url The URL the browser tab should initially navigate to.
 * @param active Whether the new tab should be in active focus.
 */
function createBrowserTab(url, active) {
    return new Promise(resolve => {
        if (!active) {
            active = false;
        }
        chrome.tabs.create({
            url: url,
            active: active
        }, resolve);
    });
}

/**
 * Executes a script in the top frame of the current tab.
 * @param int The Chrome tab ID to execute the script in.
 * @param code A string of JavaScript code to execute.
 * @param file A file name in the Chrome extension to execute.
 */
function executeScript(tabId, code, file) {
    return new Promise(resolve => {
        chrome.tabs.executeScript(tabId, {
            code: code,
            file: file,
        }, scriptResult => {
            // The script is injected into the top frame only; first index contains our top-frame return value
            resolve(scriptResult[0])
        });
    });
}

/**
 * Finds the Chrome tab ID of the HTTP subscription popup window. Assumes only one exists.
 */
function findHttpSubscriptionPopupTab() {
    return new Promise(resolve => {
        chrome.tabs.query({
            windowType: 'popup',
            url: '*sdks/initOneSignalHttp*'
        }, tabs => {
            if (tabs.length == 0) {
                resolve(null);
            }
            resolve(tabs[0].id);
        });
    });
}

var COMMANDS = {
    SET_NOTIFICATION_PERMISSION: 'SET_NOTIFICATION_PERMISSION',
    SET_POPUP_PERMISSION: 'SET_POPUP_PERMISSION',
    CREATE_BROWSER_TAB: 'CREATE_BROWSER_TAB',
    EXECUTE_SCRIPT: 'EXECUTE_SCRIPT',
    ACCEPT_HTTP_SUBSCRIPTION_POPUP: 'ACCEPT_HTTP_SUBSCRIPTION_POPUP'
};

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log('OneSignal Ext: Received message:', request);
    if (request.command === COMMANDS.SET_NOTIFICATION_PERMISSION) {
        console.log('Setting notification permission.');
        setNotificationPermission(request.siteUrl, request.permission)
            .then(() => sendResponse({success: true}));
    } else if (request.command === COMMANDS.SET_POPUP_PERMISSION) {
        console.log('Setting popup permission.');
        setPopupPermission(request.siteUrl, request.permission)
            .then(() => sendResponse({success: true}));
    } else if (request.command === COMMANDS.CREATE_BROWSER_TAB) {
        createBrowserTab(request.url, request.active)
            .then(() => sendResponse({success: true}));
    } else if (request.command === COMMANDS.EXECUTE_SCRIPT) {
        executeScript(request.code)
            .then(result => sendResponse({success: true, result: result}));
    } else if (request.command === COMMANDS.ACCEPT_HTTP_SUBSCRIPTION_POPUP) {
        findHttpSubscriptionPopupTab()
            .then(tabId => {
               if (tabId) {
                   return executeScript(tabId, null, 'accept-http-subscription-popup.js');
               } else {
                   sendResponse({success: false, error: 'The subscription popup window could not be found.'});
               }
            })
            .then(scriptResult => {
               if (scriptResult === 'successful') {
                   sendResponse({success: true})
               } else {
                   sendResponse({success: false, error: 'Attempted to run script to accept subscription popup window but script failed. Script result:' + scriptResult});
               }
            });
    }
    return true;
});

console.log('OneSignal Ext: Started up.');