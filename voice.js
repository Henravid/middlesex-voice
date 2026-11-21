        document.addEventListener('DOMContentLoaded', () => {
            // Toast Notification System
            function showToast(message, type = 'info') {
                const container = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = `px-6 py-3 rounded-full shadow-lg text-white font-semibold text-sm transform transition-all duration-300 translate-y-[-100%] opacity-0 ${type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`;
                toast.textContent = message;
                
                container.appendChild(toast);
                
                // Animate in
                setTimeout(() => {
                    toast.classList.remove('translate-y-[-100%]', 'opacity-0');
                    toast.classList.add('translate-y-0', 'opacity-100');
                }, 10);
                
                // Animate out and remove
                setTimeout(() => {
                    toast.classList.remove('translate-y-0', 'opacity-100');
                    toast.classList.add('translate-y-[-100%]', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            }

            // Web Speech API Initialization
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            let recognition = null;
            let isListening = false;
            let shouldListen = false;
            let isStarting = false;
            let pageSuspended = false;

            const btn = document.getElementById('toggle-voice-btn');
            const statusIndicator = document.getElementById('voice-status');
            const transcriptPanel = document.getElementById('voice-transcript');
            const transcriptText = document.getElementById('voice-transcript-text');

            if (!SpeechRecognition) {
                showToast("Speech Recognition is not supported in this browser. Try Chrome.", "error");
                btn.addEventListener('click', () => {
                    showToast("Speech Recognition is not supported in this browser. Try Chrome.", "error");
                });
                return;
            }

            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            // Voice Navigation State
            let numberBadges = [];
            let activeClickableElements = [];
            let focusIndex = -1;

            recognition.onstart = function() {
                isStarting = false;
                if (!shouldListen || pageSuspended) {
                    recognition.stop();
                    return;
                }
                isListening = true;
                statusIndicator.classList.remove('hidden');
                btn.classList.add('bg-red-600', 'animate-pulse');
                btn.classList.remove('bg-red-800');
                showToast("Voice engine activated.");
            };

            recognition.onresult = function(event) {
                if (!shouldListen || pageSuspended) return;
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript.trim();
                    if (!transcript) continue;
                    transcriptText.textContent = transcript;
                    transcriptPanel.hidden = false;
                    if (result.isFinal) {
                        processCommand(transcript.toLowerCase());
                        if (!shouldListen) break;
                    }
                }
            };

            recognition.onerror = function(event) {
                console.error("Speech recognition error", event.error);
                if (event.error === 'no-speech' || (event.error === 'aborted' && (pageSuspended || !shouldListen))) {
                    return;
                }
                shouldListen = false;
                isStarting = false;
                isListening = false;
                updateUIOnStop();
                transcriptPanel.hidden = true;
                transcriptText.textContent = '';
                showToast(event.error === 'not-allowed' || event.error === 'service-not-allowed'
                    ? 'Microphone access was denied. Allow access and press the microphone button to try again.'
                    : `Voice recognition stopped (${event.error}). Press the microphone button to try again.`, 'error');
            };

            recognition.onend = function() {
                isStarting = false;
                isListening = false;
                updateUIOnStop();
                if (shouldListen && !pageSuspended) {
                    startListening();
                }
            };

            function startListening() {
                if (isStarting || isListening || pageSuspended) return;
                shouldListen = true;
                isStarting = true;
                try {
                    recognition.start();
                } catch (error) {
                    console.error('Unable to start voice recognition:', error);
                    shouldListen = false;
                    isStarting = false;
                    updateUIOnStop();
                    transcriptPanel.hidden = true;
                    transcriptText.textContent = '';
                    showToast('Voice recognition could not start. Press the microphone button to try again.', 'error');
                }
            }

            function stopListening() {
                shouldListen = false;
                if (isListening || isStarting) recognition.stop();
                isListening = false;
                isStarting = false;
                updateUIOnStop();
                transcriptPanel.hidden = true;
                transcriptText.textContent = '';
            }

            function updateUIOnStop() {
                statusIndicator.classList.add('hidden');
                btn.classList.remove('bg-red-600', 'animate-pulse');
                btn.classList.add('bg-red-800');
                hideNumbers();
            }

            btn.addEventListener('click', () => {
                if (shouldListen) {
                    stopListening();
                    showToast("Voice engine deactivated on this page. It will restart on the next page.");
                } else {
                    startListening();
                }
            });

            window.addEventListener('pagehide', () => {
                pageSuspended = true;
                if (isListening || isStarting) recognition.stop();
            });

            window.addEventListener('pageshow', event => {
                if (event.persisted) {
                    pageSuspended = false;
                    shouldListen = true;
                    startListening();
                }
            });

            // Command Processing Logic
            // Virtual mouse cursor
            const cursor = document.createElement('div');
            cursor.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:10000;pointer-events:none;display:none;transform:translate(-3px,-2px)';
            cursor.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2l7 19 3-8 8-3z" fill="#dc2626" stroke="#fff" stroke-width="1.5"/></svg>';
            document.body.appendChild(cursor);
            let cx = window.innerWidth / 2, cy = window.innerHeight / 2;

            function setCursor(x, y) {
                cx = Math.max(0, Math.min(window.innerWidth - 1, x));
                cy = Math.max(0, Math.min(window.innerHeight - 1, y));
                cursor.style.display = 'block';
                cursor.style.left = cx + 'px';
                cursor.style.top = cy + 'px';
                const el = document.elementFromPoint(cx, cy);
                if (el) {
                    ['mouseover', 'mousemove'].forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: cx, clientY: cy, view: window })));
                }
            }

            const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
            function parseAmount(str) {
                const m = str.match(/\d+/);
                if (m) return parseInt(m[0], 10);
                for (const w in NUM_WORDS) if (new RegExp('\\b' + w + '\\b').test(str)) return NUM_WORDS[w];
                return null;
            }

            function moveMouse(command) {
                const step = (parseAmount(command) || 1) * 50;
                const big = /far|lot/.test(command) ? 4 : 1;
                if (command.includes("center") || command.includes("middle")) return setCursor(window.innerWidth / 2, window.innerHeight / 2);
                const toNum = command.match(/(?:to|on)\s+(?:number\s+)?(\d+)/);
                if (toNum && activeClickableElements[parseInt(toNum[1], 10) - 1]) {
                    const r = activeClickableElements[parseInt(toNum[1], 10) - 1].getBoundingClientRect();
                    return setCursor(r.left + r.width / 2, r.top + r.height / 2);
                }
                if (command.includes("left")) setCursor(cx - step * big, cy);
                else if (command.includes("right")) setCursor(cx + step * big, cy);
                else if (command.includes("up")) setCursor(cx, cy - step * big);
                else if (command.includes("down")) setCursor(cx, cy + step * big);
                else showToast('Try "mouse left 3", "mouse to center", "mouse to 5"', 'error');
            }

            function mouseClick(kind) {
                if (cursor.style.display === 'none') setCursor(cx, cy);
                const el = document.elementFromPoint(cx, cy);
                if (!el) return;
                const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
                if (kind === 'right') {
                    el.dispatchEvent(new MouseEvent('mousedown', { ...opts, button: 2 }));
                    el.dispatchEvent(new MouseEvent('mouseup', { ...opts, button: 2 }));
                    const proceed = el.dispatchEvent(new MouseEvent('contextmenu', { ...opts, button: 2 }));
                    if (proceed) showContextMenu(el);
                    showToast("Right click");
                    return;
                }
                hideContextMenu();
                const target = el.closest('a, button, input, textarea, select, label') || el;
                ['mousedown', 'mouseup'].forEach(t => el.dispatchEvent(new MouseEvent(t, opts)));
                if (target.focus) target.focus();
                el.dispatchEvent(new MouseEvent('click', opts));
                if (kind === 'double') el.dispatchEvent(new MouseEvent('dblclick', { ...opts, detail: 2 }));
                showToast(kind === 'double' ? "Double click" : "Click");
            }

            // Simple page context menu, since scripted events cannot open the native one
            let ctxMenu = null;
            function hideContextMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
            function showContextMenu(el) {
                hideContextMenu();
                const link = el.closest('a[href]');
                const items = [];
                if (link) items.push(['Open link', () => link.click()], ['Copy link address', () => navigator.clipboard && navigator.clipboard.writeText(link.href)]);
                items.push(['Back', () => history.back()], ['Reload', () => location.reload()], ['Scroll to top', () => window.scrollTo({ top: 0, behavior: 'smooth' })]);
                ctxMenu = document.createElement('div');
                ctxMenu.className = 'voice-context-menu bg-white rounded-md shadow-xl border border-gray-200 text-sm py-1';
                ctxMenu.style.cssText = `position:fixed;z-index:10001;left:${Math.min(cx, window.innerWidth - 180)}px;top:${Math.min(cy, window.innerHeight - 40 * items.length)}px;min-width:160px`;
                items.forEach(([label, fn]) => {
                    const b = document.createElement('button');
                    b.className = 'block w-full text-left px-4 py-2 hover:bg-gray-100';
                    b.textContent = label;
                    b.addEventListener('click', () => { hideContextMenu(); fn(); });
                    ctxMenu.appendChild(b);
                });
                document.body.appendChild(ctxMenu);
            }
            document.addEventListener('click', e => { if (ctxMenu && !ctxMenu.contains(e.target)) hideContextMenu(); });

            // Typing
            function activeField() {
                const a = document.activeElement;
                return a && (a.matches('input:not([type=button]):not([type=submit]), textarea') || a.isContentEditable) ? a : null;
            }
            function typeText(text) {
                const f = activeField();
                if (!f) return showToast("Focus a text field first (say \"focus search\" or move the mouse and click).", "error");
                if (f.isContentEditable) { document.execCommand('insertText', false, text); return; }
                f.setRangeText(text, f.selectionStart, f.selectionEnd, 'end');
                f.dispatchEvent(new Event('input', { bubbles: true }));
            }
            function pressKey(key) {
                const f = activeField();
                if (key === 'backspace' && f && !f.isContentEditable) {
                    if (f.selectionStart === f.selectionEnd && f.selectionStart > 0) f.setRangeText('', f.selectionStart - 1, f.selectionStart, 'end');
                    else f.setRangeText('', f.selectionStart, f.selectionEnd, 'end');
                    f.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (key === 'enter' && f) {
                    f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                    if (f.form) f.form.requestSubmit();
                }
            }

            function processCommand(command) {
                command = command.replace(/[.,!?]+$/g, '');

                // Typing commands
                if (/^(type|write|dictate)\s+/.test(command)) {
                    return typeText(command.replace(/^(type|write|dictate)\s+/, ''));
                }
                if (command === 'disable microphone' || command === 'turn off microphone') {
                    stopListening();
                    return showToast('Voice engine deactivated on this page. It will restart on the next page.');
                }
                if (command === "backspace" || command === "delete") return pressKey('backspace');
                if (command === "clear text" || command === "clear field") {
                    const f = activeField();
                    if (f && !f.isContentEditable) { f.value = ''; f.dispatchEvent(new Event('input', { bubbles: true })); }
                    return;
                }
                if (command === "space") return typeText(' ');
                if (command.includes("focus search") || command.includes("search box")) {
                    document.getElementById('voice-search').focus();
                    return showToast("Search focused. Say \"type ...\"");
                }

                if (/^(?:turn on |enable |switch to )?dark mode$/.test(command)) {
                    document.dispatchEvent(new CustomEvent('voice-theme', { detail: 'dark' }));
                    return showToast('Dark mode on.');
                }
                if (/^(?:turn on |enable |switch to )?light mode$/.test(command) || command === 'turn off dark mode' || command === 'disable dark mode') {
                    document.dispatchEvent(new CustomEvent('voice-theme', { detail: 'light' }));
                    return showToast('Light mode on.');
                }
                if (command === 'toggle dark mode' || command === 'toggle light mode' || command === 'toggle theme') {
                    document.dispatchEvent(new CustomEvent('voice-theme', { detail: 'toggle' }));
                    return showToast(document.documentElement.classList.contains('dark') ? 'Dark mode on.' : 'Light mode on.');
                }

                // Mouse commands
                if (command.includes("right click")) return mouseClick('right');
                if (command.includes("double click")) return mouseClick('double');
                if (command === "click" || command === "left click" || command === "click here") return mouseClick('left');
                if (/^(move |mouse )/.test(command) || command.startsWith("cursor")) return moveMouse(command);

                // Command: Help
                if (command.includes("help") || command.includes("commands")) {
                    showToast('Say: "dark mode", "light mode", "toggle light mode", "disable microphone", "scroll up/down [twice, three times, or four times]", "mouse left/right/up/down [n]", "click", "right click", "type [text]", "show numbers", "click [number/text]", "open [number/text]", "look at [number/text]"');
                }
                
                // Command: Show Numbers
                else if (command === "show numbers" || command === "numbers") {
                    showNumbers();
                }
                
                // Command: Hide Numbers
                else if (command.includes("hide numbers") || command.includes("clear numbers")) {
                    hideNumbers();
                }
                
                // Command: Click a numbered or named target
                else if (/^(click|select|open|look\s+at)\s+/.test(command)) {
                    const target = command.replace(/^(click|select|open|look\s+at)\s+/i, '').trim();
                    
                    // Check if it's a number
                    const numMatch = target.match(/^\d+$/);
                    if (numMatch) {
                        clickNumber(parseInt(target, 10));
                    } else {
                        // Click by text
                        clickText(target);
                    }
                }
                
                // Command: Tab / Next Element
                else if (command === "tab" || command.includes("next element") || command.includes("next link")) {
                    tabFocus();
                }
                
                // Command: Enter / Submit
                else if (command === "enter" || command === "return" || command.includes("submit")) {
                    clickFocused();
                }

                // Command: Scroll
                else if (command.includes("scroll down") || command === "down" ||
                         command.includes("scroll up") || command === "up") {
                    const match = command.match(/\b(twice|thrice|(?:two|three|four|2|3|4)\s+times)\b/);
                    const counts = { twice: 2, thrice: 3, 'two times': 2, 'three times': 3, 'four times': 4, '2 times': 2, '3 times': 3, '4 times': 4 };
                    const count = match ? counts[match[1].replace(/\s+/g, ' ')] : 1;
                    const direction = command.includes("scroll down") || command === "down" ? 1 : -1;
                    window.scrollBy({ top: direction * window.innerHeight / 2 * count, behavior: 'smooth' });
                }
                else if (command.includes("bottom")) {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
                else if (command.includes("top")) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }

            // Voice Action Functions
            function showNumbers() {
                hideNumbers(); // Clear existing
                activeClickableElements = Array.from(document.querySelectorAll('a, button, summary, input[type="button"], input[type="submit"]')).filter(el => {
                    // Only get visible elements
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                });

                if (activeClickableElements.length === 0) {
                    showToast("No clickable elements found on screen.");
                    return;
                }

                const container = document.createElement('div');
                container.id = 'voice-badges-container';
                document.body.appendChild(container);

                activeClickableElements.forEach((el, index) => {
                    const num = index + 1;
                    const rect = el.getBoundingClientRect();
                    const badge = document.createElement('div');
                    badge.className = 'voice-number-badge';
                    badge.textContent = num;
                    
                    // Position absolute relative to the document body
                    const scrollY = window.scrollY || window.pageYOffset;
                    const scrollX = window.scrollX || window.pageXOffset;
                    
                    badge.style.top = `${rect.top + scrollY - 10}px`;
                    badge.style.left = `${rect.left + scrollX - 10}px`;
                    
                    container.appendChild(badge);
                    numberBadges.push(badge);
                });
                
                showToast(`Generated ${activeClickableElements.length} numerical targets.`);
            }

            function hideNumbers() {
                const container = document.getElementById('voice-badges-container');
                if (container) container.remove();
                numberBadges = [];
                activeClickableElements = [];
            }

            function clickNumber(num) {
                if (activeClickableElements.length === 0) {
                    // Try to auto-show numbers if user asks to click one without them visible
                    showNumbers();
                }
                
                const index = num - 1;
                if (index >= 0 && index < activeClickableElements.length) {
                    const el = activeClickableElements[index];
                    showToast(`Clicking item ${num}...`);
                    hideNumbers(); // cleanup
                    
                    // Simulate click
                    el.focus();
                    el.click();
                    
                    // If it's a link to an anchor on the same page, scroll to it smoothly
                    if (el.tagName.toLowerCase() === 'a' && el.getAttribute('href').startsWith('#')) {
                        const targetId = el.getAttribute('href').substring(1);
                        const targetEl = document.getElementById(targetId);
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                } else {
                    showToast(`Number ${num} not found.`, "error");
                }
            }

            function clickText(text) {
                const clickableElements = Array.from(document.querySelectorAll('a, button, summary'));
                const searchString = text.toLowerCase();
                
                // Find element whose text content contains the spoken words
                const target = clickableElements.find(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 &&
                        window.getComputedStyle(el).visibility !== 'hidden' &&
                        el.textContent && el.textContent.toLowerCase().includes(searchString);
                });

                if (target) {
                    showToast(`Clicking "${text}"...`);
                    target.focus();
                    target.click();
                } else {
                    showToast(`Element with text "${text}" not found.`, "error");
                }
            }

            function getFocusableElements() {
                return Array.from(document.querySelectorAll('a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                    .filter(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                    });
            }

            function tabFocus() {
                const focusable = getFocusableElements();
                if (focusable.length === 0) return;

                // Sync focusIndex with currently focused element in case user clicked manually
                const currentFocus = document.activeElement;
                if (currentFocus && currentFocus !== document.body) {
                    focusIndex = focusable.indexOf(currentFocus);
                }

                focusIndex++;
                if (focusIndex >= focusable.length) {
                    focusIndex = 0; // wrap around
                }

                focusable[focusIndex].focus();
                
                // Scroll into view if needed
                const elRect = focusable[focusIndex].getBoundingClientRect();
                if (elRect.top < 0 || elRect.bottom > window.innerHeight) {
                    focusable[focusIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

            function clickFocused() {
                const active = document.activeElement;
                if (active && active !== document.body && typeof active.click === 'function') {
                    showToast("Simulating 'Enter' press...");
                    active.click();
                } else {
                    showToast("No clickable element currently focused.", "error");
                }
            }

            startListening();
        });
