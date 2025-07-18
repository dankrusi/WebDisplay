let timeLeft = 5;
const countdown = document.getElementById('countdown');
const button = document.getElementById('settingsButton');

countdown.textContent = timeLeft;

const interval = setInterval(() => {
    timeLeft -= 1;
    countdown.textContent = timeLeft;

    if (timeLeft <= 0) {
        clearInterval(interval);
        window.webdisplay.onSplashTimeout();
    }
}, 1000);

button.addEventListener('click', () => {
    window.webdisplay.createSettingsWindow();
});