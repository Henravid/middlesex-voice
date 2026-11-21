(function () {
    const storageKey = 'middlesexTheme';
    const root = document.documentElement;
    let storageError = false;

    try {
        root.classList.toggle('dark', localStorage.getItem(storageKey) === 'dark');
    } catch (error) {
        storageError = true;
        console.error('Unable to restore theme preference:', error);
    }

    function updateControl() {
        const button = document.getElementById('theme-toggle');
        button.setAttribute('aria-pressed', String(root.classList.contains('dark')));
        document.getElementById('theme-status').textContent = storageError
            ? 'Theme preference could not be saved or restored.'
            : '';
    }

    function setTheme(theme) {
        const dark = theme === 'toggle' ? !root.classList.contains('dark') : theme === 'dark';
        root.classList.toggle('dark', dark);
        try {
            localStorage.setItem(storageKey, dark ? 'dark' : 'light');
            storageError = false;
        } catch (error) {
            storageError = true;
            console.error('Unable to save theme preference:', error);
        }
        updateControl();
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateControl();
        document.getElementById('theme-toggle').addEventListener('click', () => setTheme('toggle'));
        document.addEventListener('voice-theme', event => setTheme(event.detail));
        window.addEventListener('storage', event => {
            if (event.key === storageKey || event.key === null) {
                root.classList.toggle('dark', event.newValue === 'dark');
                updateControl();
            }
        });
    });
})();
