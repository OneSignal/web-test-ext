/**
 * Click the 'Continue' button on the HTTPS modal prompt to subscribe to notifications.
 */
function acceptHttpsSubscriptionModal() {
    var continueButton = document.getElementById('unblocked-allow');
    var notificationsAlreadyEnabledErrorDom = document.getElementById('error-notifications-already-enabled');
    if (notificationsAlreadyEnabledErrorDom) {
        var areNotificationsAlreadyEnabled = (notificationsAlreadyEnabledErrorDom.style.display === 'block');
    }
    var closeButton = document.querySelector('#unblocked-cancel');

    if (notificationsAlreadyEnabledErrorDom && areNotificationsAlreadyEnabled) {
        console.log('HTTP Popup: Notifications are already enabled, so closing window.');
        closeButton.click();
    } else {
        console.log('HTTP Popup: Clicking Continue button.');
        continueButton.click();
    }
    return 'successful';
}

acceptHttpsSubscriptionModal();