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
function executeScript(tabId, options) {
    return new Promise((resolve, reject) => chrome.tabs.executeScript(tabId, options, rawResults => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
        }
        console.log('Raw Script Execution Results:', rawResults);
        resolve(rawResults);
    }));
}

/**
 * Finds the Chrome tab ID of the HTTP subscription popup window. Assumes only one exists.
 */
function findHttpSubscriptionPopupTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({
            windowType: 'popup',
            url: ['*://*/*sdks/initOneSignalHttp*',
                  '*://*/subscribe*',]
        }, tabs => {
            if (!tabs) {
                reject('Subscription prompt popup window not found.');
            }
            if (tabs.length == 0) {
                resolve(null);
            }
            if (tabs.length > 1) {
                reject("Please close all HTTP popup windows. We don't want to guess which popup window to inject the" +
                       " script into!")
            }
            resolve(tabs[0]);
        });
    });
}

/**
 * Finds the Chrome tab ID of the HTTP subscription popup window. Assumes only one exists.
 * @param parentTabUrl: The URL of the parent tab hosting the HTTPS modal prompt iFrame.
 */
function findHttpsSubscriptionModalTab(parentTabUrl) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({
            url: parentTabUrl
        }, tabs => {
            if (!tabs) {
                reject('Subscription prompt modal parent tab not found.');
            }
            if (tabs.length == 0) {
                resolve(null);
            }
            if (tabs.length > 1) {
                reject("Please close all HTTPS windows with modals. We don't want to guess which popup window to" +
                       " inject the script into!")
            }
            resolve(tabs[0]);
        });
    });
}

var store = { };
var __unresolvedScriptResult = null;
var __resolvedScriptResult = null;

var COMMANDS = {
    SET_NOTIFICATION_PERMISSION: 'SET_NOTIFICATION_PERMISSION',
    SET_POPUP_PERMISSION: 'SET_POPUP_PERMISSION',
    CREATE_BROWSER_TAB: 'CREATE_BROWSER_TAB',
    EXECUTE_SCRIPT: 'EXECUTE_SCRIPT',
    ACCEPT_HTTP_SUBSCRIPTION_POPUP: 'ACCEPT_HTTP_SUBSCRIPTION_POPUP',
    ACCEPT_HTTPS_SUBSCRIPTION_MODAL: 'ACCEPT_HTTPS_SUBSCRIPTION_MODAL',
    GET: 'GET',
    SET: 'SET'
};

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    try {
        console.log('OneSignal Ext: Received message:', request);
        if (!request.command) {
            console.error('No command received.');
        }
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
            executeScript(0, {code: request.code})
                .then(result => sendResponse({success: true, result: result}));
        } else if (request.command === COMMANDS.ACCEPT_HTTP_SUBSCRIPTION_POPUP) {
            findHttpSubscriptionPopupTab()
                .then(tab => {
                    if (tab) {
                        return setNotificationPermission(`${new URL(tab.url).origin}/*`, 'allow')
                            .then(() => tab);
                    } else {
                        Promise.reject('The subscription popup window could not be found.');
                    }
                })
                .then(tab => executeScript(tab.id, {
                    file: 'accept-http-subscription-popup.js',
                    allFrames: true,
                    runAt: 'document_idle'
                }))
                .then(scriptResults => {
                    return Promise.all(scriptResults)
                        .then(results => {
                            if (results.indexOf('successful') !== -1) {
                                sendResponse({success: true})
                            } else {
                                Promise.reject('Attempted to run script to accept subscription popup window but script failed. Script result: ' + scriptResults);
                            }
                        })
                        .catch(e => Promise.reject('Failed to run script in accept subscription popup window. Script result: ' + e));
                })
                .catch(e => {
                    console.error(e);
                    sendResponse({success: false, error: JSON.stringify(e)});
                });
        } else if (request.command === COMMANDS.ACCEPT_HTTPS_SUBSCRIPTION_MODAL) {
            findHttpsSubscriptionModalTab(request.parentTabUrl)
                .then(tab => {
                    if (tab) {
                        console.log(tab);
                        return setNotificationPermission(`${new URL(tab.url).origin}/*`, 'allow')
                            .then(() => tab);
                    } else {
                        Promise.reject('The subscription modal window could not be found.');
                    }
                })
                .then(tab => {
                    return new Promise(resolve => {
                        executeScript(tab.id, {
                            file: 'accept-https-subscription-modal.js',
                            allFrames: true
                        }, results => {
                            console.log('Raw Script Execution Results:', results);
                            resolve(results);
                        });
                    });
                })
                .then(results => {
                    __unresolvedScriptResult = results;
                    return Promise.all(results)
                        .then(resolvedResults => {
                            __resolvedScriptResult = resolvedResults;
                            if (resolvedResults.indexOf('successful') !== -1) {
                                sendResponse({success: true})
                            } else {
                                Promise.reject('Attempted to run script to accept subscription modal window but script failed. Script result: ' + resolvedResults);
                            }
                        })
                        .catch(e => Promise.reject('Failed to run script in accept subscription modal window. Script result: ' + e));
                })
                .catch(e => {
                    console.error(e);
                    sendResponse({success: false, error: JSON.stringify(e)});
                });
        } else if (request.command === COMMANDS.GET) {
            console.log(`GET '${request.key}' => '${store[request.key]}' (retrieved)`);
            sendResponse({success: true, result: store[request.key]});
        } else if (request.command === COMMANDS.SET) {
            console.log(`SET '${request.key}' => '${request.value}' (set)`);
            store[request.key] = request.value;
            sendResponse({success: true});
        }
        return true;
    } catch (e) {
        console.error(e);
    }
});

console.log('OneSignal Ext: Started up.');