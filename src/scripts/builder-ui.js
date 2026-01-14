const BUILDER_UI = {
    init: async () => {
        // Pull the verified data from storage
        const data = await chrome.storage.local.get("unmetRequirements");
        const unmetList = data.unmetRequirements || [];
        
        if (unmetList.length === 0) return;

        // Watch for Schedule Builder's dynamic search results
        const observer = new MutationObserver(() => {
            BUILDER_UI.applyHighlights(unmetList);
        });

        observer.observe(document.body, { childList: true, subtree: true });
        BUILDER_UI.applyHighlights(unmetList);
    },

    applyHighlights: (unmetList) => {
        const panels = document.querySelectorAll('.panel.panel-default');

        panels.forEach(panel => {
            if (panel.dataset.plusChecked) return;

            // Get the course name from the anchor tag
            const anchor = panel.parentElement.querySelector('a[name]');
            if (!anchor) return;
            const courseCode = anchor.name.toUpperCase();

            unmetList.forEach(req => {
                const isMatch = req.options.some(opt => {
                    const target = (opt.dept + opt.number).replace(/\s+/g, '').toUpperCase();
                    
                    // Wildcard logic (e.g., CHEM 4xxx)
                    if (target.includes('X')) {
                        const prefix = target.split('X')[0];
                        return courseCode.startsWith(prefix);
                    }
                    return courseCode === target;
                });

                if (isMatch) {
                    BUILDER_UI.injectBadge(panel, req.title);
                }
            });

            panel.dataset.plusChecked = "true";
        });
    },

    injectBadge: (panel, title) => {
        // The Gold Highlight
        panel.style.border = "3px solid #ffcc33";
        
        const header = panel.querySelector('.panel-heading');
        if (header) {
            const badge = document.createElement('span');
            // Clean up the title so it's not too long
            const shortTitle = title.split('Note:')[0].split('To ensure')[0].substring(0, 40);
            badge.innerText = `〽️ Fulfills: ${shortTitle}...`;
            
            Object.assign(badge.style, {
                backgroundColor: '#7a0019',
                color: '#ffcc33',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                marginLeft: '10px',
                fontWeight: 'bold',
                display: 'inline-block'
            });
            header.appendChild(badge);
        }
    }
};

BUILDER_UI.init();