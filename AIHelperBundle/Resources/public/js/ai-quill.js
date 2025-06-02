(function () {
    console.log("AI Helper script loaded!");

    function findQuillEditorForToolbar(toolbar) {
        const doc = toolbar.ownerDocument || document;
        const toolbars = Array.from(doc.querySelectorAll('.ql-toolbar'));
        const editors = Array.from(doc.querySelectorAll('.ql-editor'));
        const idx = toolbars.indexOf(toolbar);

        if (idx !== -1 && editors[idx]) return editors[idx];

        let current = toolbar.nextElementSibling;
        while (current) {
            if (current.classList && current.classList.contains('ql-editor')) return current;
            current = current.nextElementSibling;
        }

        if (editors.length === 1) return editors[0];
        return null;
    }

    function getPimcoreDocumentLanguage() {
        for (const key in pimcore.globalmanager.store) {
            if (key.startsWith("document_")) {
                const doc = pimcore.globalmanager.store[key];
                return doc?.data?.properties?.language?.data || null;
            }
        }
        return null;
    }

    function insertAIButton(toolbar) {
        if (toolbar.querySelector('.ql-ai-assist')) return;

        // ✅ Always append a new group at the end of the toolbar
        const group = document.createElement('span');
        group.className = 'ql-formats';
        toolbar.appendChild(group);

        const wrapper = document.createElement('span');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';

        const btn = document.createElement('button');
        btn.className = 'ql-ai-assist';
        btn.innerHTML = '🤖';
        btn.title = 'AI Assist';
        btn.type = 'button';
        btn.style.padding = '0 6px';

        const dropdown = document.createElement('div');
        dropdown.className = 'ai-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.background = '#fff';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.padding = '8px';
        dropdown.style.display = 'none';
        dropdown.style.zIndex = 10000;
        dropdown.style.minWidth = '180px';
        dropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        dropdown.style.fontSize = '14px';
        dropdown.style.whiteSpace = 'nowrap';

        const actionSelect = document.createElement('select');
        [
            { label: 'Translate', value: 'translate' },
            { label: 'Correct Grammar', value: 'grammar' },
            { label: 'Complete Sentence', value: 'complete' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            actionSelect.appendChild(option);
        });
        dropdown.appendChild(actionSelect);

        const langInput = document.createElement('input');
        langInput.type = 'text';
        langInput.placeholder = 'Target Language (e.g., en)';
        langInput.style.margin = '6px 0';
        langInput.style.width = '100%';
        dropdown.appendChild(langInput);

        actionSelect.addEventListener('change', () => {
            langInput.style.display = actionSelect.value === 'translate' ? 'block' : 'none';
        });
        actionSelect.dispatchEvent(new Event('change')); // initialize

        const runBtn = document.createElement('button');
        runBtn.textContent = 'Run AI';
        runBtn.style.display = 'block';
        runBtn.style.marginTop = '8px';
        runBtn.style.width = '100%';
        runBtn.addEventListener('click', () => {
            dropdown.style.display = 'none';
            const action = actionSelect.value;
            const targetLang = langInput.value || 'en';

            const editorEl = findQuillEditorForToolbar(toolbar);
            let quill = editorEl?.__quill;

            if (!quill && window.Quill?.find) {
                const container = editorEl.closest('.ql-container');
                quill = window.Quill.find(container);
            }

            if (!quill) {
                alert('Could not find Quill instance.');
                return;
            }

            processAIAction(action, quill, btn, targetLang);
        });
        dropdown.appendChild(runBtn);

        btn.addEventListener('click', () => {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', (event) => {
            if (!wrapper.contains(event.target)) {
                dropdown.style.display = 'none';
            }
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(dropdown);
        group.appendChild(wrapper);

        console.log("AI button injected at end of toolbar:", toolbar);
    }


    function processAIAction(actionType, quill, btn, targetLang = 'en') {
        const html = quill.root.innerHTML.trim();
        if (!html || html === '<p><br></p>') {
            alert('No content to process.');
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳';

        const sourceLang = getPimcoreDocumentLanguage() || 'de';

        Ext.Ajax.request({
            url: '/ai/process',
            method: 'POST',
            params: {
                text: html,
                action: actionType,
                sourceLang: sourceLang,
                targetLang: targetLang
            },
            success: function (response) {
                try {
                    const data = Ext.decode(response.responseText);
                    if (data.result && quill?.setText) {
                        quill.clipboard.dangerouslyPasteHTML(data.result);  // ✅ inserts as formatted HTML
                        btn.textContent = '✅';
                    } else {
                        throw new Error('No valid result');
                    }
                } catch (e) {
                    console.error(e);
                    btn.textContent = '❌';
                    alert('Invalid response from server.');
                }
            },
            failure: function () {
                btn.textContent = '❌';
                alert('AI processing failed (500 or unreachable).');
            },
            callback: function () {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = '🤖';
                }, 1500);
            }
        });
    }

    function observeToolbars(doc) {
        if (!doc) return;
        doc.querySelectorAll('.ql-toolbar').forEach(toolbar => {
            insertAIButton(toolbar);
            toolbar.setAttribute('data-ai-ready', 'true');
        });

        const observer = new MutationObserver(() => {
            doc.querySelectorAll('.ql-toolbar:not([data-ai-ready])').forEach(toolbar => {
                insertAIButton(toolbar);
                toolbar.setAttribute('data-ai-ready', 'true');
            });
        });

        observer.observe(doc.body, {
            childList: true,
            subtree: true
        });
    }

    function observeIframes() {
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (doc && doc.body) {
                    observeToolbars(doc);
                } else {
                    iframe.addEventListener('load', function () {
                        try {
                            observeToolbars(iframe.contentDocument || iframe.contentWindow.document);
                        } catch (e) {
                            console.error("AI Helper: iframe observer error", e);
                        }
                    });
                }
            } catch (e) {
                console.error("AI Helper: iframe access error", e);
            }
        });
    }

    function init() {
        if (!document.body) {
            setTimeout(init, 50);
            return;
        }
        console.log("AI Helper init running");
        observeToolbars(document);
        observeIframes();
        const iframeObserver = new MutationObserver(observeIframes);
        iframeObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
