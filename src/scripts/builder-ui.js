const BUILDER_UI = {
    state: { reqsOnly: false, minGPA: 0.0 },

    init: async () => {
        console.log("UMN Plus: Starting Heartbeat...");
        const data = await chrome.storage.local.get("unmetRequirements");
        const unmetList = data.unmetRequirements || [];

        // HEARTBEAT: Keep looking for that specific list-group
        const findSidebar = setInterval(() => {
            const sidebar = document.querySelector('.list-group.visible-lg.visible-md');
            
            if (sidebar) {
                console.log("UMN Plus: Native sidebar found!");
                clearInterval(findSidebar);
                BUILDER_UI.injectDashboard(sidebar, unmetList);
            }
        }, 500);

        const observer = new MutationObserver(() => {
            BUILDER_UI.processResults(unmetList);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },

    injectDashboard: (sidebar, unmetList) => {
        if (document.getElementById('plus-mission-control')) return;
        
        // We create an <a> tag style to match the UMN design perfectly
        const dashboard = document.createElement('div');
        dashboard.id = 'plus-mission-control';
        dashboard.style = "margin-bottom: 15px; border: 2px solid #7a0019; border-radius: 4px; background: white; overflow: hidden;";
        
        dashboard.innerHTML = `
            <div style="background-color: #7a0019; color: #ffcc33; padding: 10px; font-weight: bold; font-size: 13px;">
                〽️ UMN Plus: Mission Control
            </div>
            <div style="padding: 12px;">
                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 10px; font-weight: normal;">
                    <input type="checkbox" id="plus-req-toggle" style="margin-right: 10px; width: 16px; height: 16px;">
                    <span style="font-size: 13px; color: #333;">Show Degree Reqs Only</span>
                </label>
                <div style="font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 8px;">
                    <strong>${unmetList.length}</strong> Requirements Tracked
                </div>
            </div>
        `;
        
        sidebar.prepend(dashboard);

        document.getElementById('plus-req-toggle').addEventListener('change', (e) => {
            BUILDER_UI.state.reqsOnly = e.target.checked;
            console.log("Filter toggled:", BUILDER_UI.state.reqsOnly);
            BUILDER_UI.processResults(unmetList);
        });
    },

    processResults: (unmetList) => {
        const panels = document.querySelectorAll('.panel.panel-default');
        
        panels.forEach(panel => {
            if (panel.id === 'plus-mission-control') return;

            const anchor = panel.parentElement.querySelector('a[name]');
            if (!anchor) return;
            const courseCode = anchor.name.toUpperCase();

            const match = unmetList.find(req => 
                req.options.some(opt => {
                    const target = (opt.dept + opt.number).replace(/\s+/g, '').toUpperCase();
                    return target.includes('X') ? courseCode.startsWith(target.split('X')[0]) : courseCode === target;
                })
            );

            // HIGHLIGHTING
            if (match) {
                panel.style.border = "3px solid #ffcc33";
                // Add a small badge if it doesn't exist
                if (!panel.dataset.plusBadged && panel.querySelector('.panel-heading')) {
                    const badge = document.createElement('span');
                    badge.innerText = "〽️ Fulfills Req";
                    badge.style = "float: right; background: #7a0019; color: #ffcc33; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;";
                    panel.querySelector('.panel-heading').appendChild(badge);
                    panel.dataset.plusBadged = "true";
                }
            }

            // FILTERING logic
            if (BUILDER_UI.state.reqsOnly) {
                if (match) {
                    panel.style.display = 'block';
                } else {
                    panel.style.display = 'none';
                }
            } else {
                panel.style.display = 'block'; // Show all if filter is off
            }
        });
    }
};

BUILDER_UI.init();