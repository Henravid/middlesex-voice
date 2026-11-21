(function () {
    let timer;
    let overlay;

    function hideTransition() {
        clearTimeout(timer);
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }

    function showTransition() {
        hideTransition();
        overlay = document.createElement('div');
        overlay.className = 'page-transition';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');

        const spinner = document.createElement('span');
        spinner.className = 'page-transition-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.textContent = `Loading ${document.title.split('|')[0].trim()}...`;
        overlay.append(spinner, label);
        document.body.appendChild(overlay);
        timer = setTimeout(hideTransition, 500);
    }

    document.addEventListener('DOMContentLoaded', showTransition);
    window.addEventListener('pagehide', hideTransition);
    window.addEventListener('pageshow', event => {
        if (event.persisted) showTransition();
    });
})();
