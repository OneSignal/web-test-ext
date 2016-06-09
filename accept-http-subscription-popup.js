function acceptHttpSubscriptionPopup() {
    var continueButton = document.getElementById('show-prompt-button');
    if (continueButton) {
        continueButton.click();
        return 'successful';
    }
}

acceptHttpSubscriptionPopup();