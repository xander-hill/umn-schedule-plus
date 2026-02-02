// src/scripts/builder-ui.js

const COURSE_SERVICE = {
    fetchCourse: async (dept, num) => {
        console.log(`〽️ UMN Plus: Searching for ${dept} ${num}...`);
        
        const payload = new URLSearchParams();
        payload.append('type', 'param_search');
        payload.append('institution', 'UMNTC');
        payload.append('campus', 'UMNTC');
        payload.append('term', '1263');
        payload.append('json', JSON.stringify([
            { "param": "subject", "value": dept, "token": "subject", "standalone": true, "raw_value": dept },
            { "param": "number", "value": num, "token": "number", "standalone": true, "raw_value": num }
        ]));

        try {
            const response = await fetch('https://schedulebuilder.umn.edu/api.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest' 
                },
                body: payload
            });

            const data = await response.json();
            // This API returns an array of courses. We want the first match.
            return data && data.length > 0 ? data[0] : null;
        } catch (e) {
            console.error("❌ Fetch failed:", e);
            return null;
        }
    }
};

const BUILDER_UI = {
    state: { unmetList: [], completedCourses: [], reqsOnly: false },

    init: async () => {
        console.log("〽️ UMN Plus: Init started.");
        const data = await chrome.storage.local.get(["unmetRequirements", "completedCourses"]);
        BUILDER_UI.state.unmetList = data.unmetRequirements || [];
        
        // 1. Permanent Heartbeat
        setInterval(() => {
            const sidebar = document.querySelector('.list-group.visible-lg.visible-md');
            if (sidebar) {
                BUILDER_UI.injectDashboard(sidebar);
            }
        }, 1000);

        // 2. Observer for search results
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const panels = node.querySelectorAll('.panel-default');
                        panels.forEach(p => BUILDER_UI.processPanel(p));
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },

    injectDashboard: (sidebar) => {
        if (document.getElementById('plus-apas-trigger')) return;
        
        console.log("〽️ UMN Plus: Injecting Gold Trigger into sidebar.");
        const trigger = document.createElement('div');
        trigger.id = 'plus-apas-trigger';
        trigger.className = 'list-group-item';
        trigger.style = "cursor: pointer; background: #fff8e1; border-left: 5px solid #ffcc33; font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between;";
        trigger.innerHTML = `<span style="color: #7a0019;">〽️ Degree Requirements (APAS)</span><span style="color: #7a0019;">&rsaquo;</span>`;
        
        sidebar.prepend(trigger);

        trigger.onclick = (e) => {
            console.log("〽️ UMN Plus: Gold Trigger Clicked!");
            BUILDER_UI.renderApasSubpage();
        };
    },

    renderApasSubpage: () => {
        const mainStage = document.querySelector('#content') || 
                        document.querySelector('.results-column') || 
                        document.querySelector('.col-md-9');

        if (!mainStage) return;

        let explorer = document.getElementById('plus-explorer-view');
        if (!explorer) {
            explorer = document.createElement('div');
            explorer.id = 'plus-explorer-view';
            mainStage.prepend(explorer);
        }

        explorer.style.display = 'block';
        explorer.innerHTML = `
            <div style="padding: 20px; background: white; border: 2px solid #7a0019; border-radius: 8px; min-height: 600px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #7a0019; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="margin:0; color:#7a0019;">Degree Requirements Explorer</h2>
                    <button id="plus-close-explorer" style="cursor:pointer; padding: 5px 15px; background: #eee; border: 1px solid #ccc;">✕ Close Explorer</button>
                </div>
                
                <div id="apas-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                    ${BUILDER_UI.state.unmetList.map((req, i) => {
                        // Determine colors based on status
                        const isMet = req.status === 'MET';
                        const isIP = req.status === 'IP';
                        const statusColor = isMet ? '#2e7d32' : (isIP ? '#ed6c02' : '#d32f2f');
                        const statusText = isMet ? 'COMPLETED' : (isIP ? 'IN-PROGRESS' : 'NOT MET');

                        return `
                            <div class="plus-req-card" data-index="${i}" 
                                style="border: 1px solid #ddd; border-top: 6px solid ${statusColor}; padding: 15px; cursor: pointer; background: #fafafa; border-radius: 8px; position: relative; transition: transform 0.1s;">
                                
                                <div style="font-size: 9px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">
                                    ${req.requirementTitle || 'General'}
                                </div>

                                <h3 style="font-size: 14px; margin: 0 0 10px 0; color: #333; line-height: 1.2;">${req.title}</h3>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                                    <span style="color: ${statusColor}; font-weight: bold; font-size: 11px;">
                                        ${isMet ? '✅' : (isIP ? '⏳' : '❌')} ${statusText}
                                    </span>
                                    <span style="font-size: 10px; color: #666; background: #eee; padding: 2px 6px; border-radius: 10px;">
                                        ${req.options.length} courses
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>`;

        // Re-attach event listeners...
        document.getElementById('plus-close-explorer').onclick = () => explorer.style.display = 'none';
        explorer.querySelectorAll('.plus-req-card').forEach(card => {
            card.onclick = () => {
                const index = card.getAttribute('data-index');
                BUILDER_UI.launchSearch(BUILDER_UI.state.unmetList[index]);
            };
        });
    },

    launchSearch: async (req) => {
        // 1. Pull the student's history from storage
        const storage = await chrome.storage.local.get("completedCourses");
        const completed = storage.completedCourses || [];

        const mainStage = document.querySelector('#plus-explorer-view') || document.querySelector('#content');
        mainStage.innerHTML = `<div style="padding:20px;"><h2>〽️ Auditing ${req.title}...</h2></div>`;

        // 2. Fetch API data for all options
        const promises = req.options.map(opt => COURSE_SERVICE.fetchCourse(opt.dept, opt.num));
        const results = await Promise.all(promises);

        mainStage.innerHTML = `
            <div style="padding: 20px; font-family: sans-serif; background: #f4f4f4; min-height: 100vh;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="color:#7a0019; margin:0;">${req.title}</h2>
                    <button onclick="location.reload()" style="cursor:pointer; padding:8px 15px; border:1px solid #7a0019; background:white; color:#7a0019; font-weight:bold; border-radius:4px;">← Back</button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                    ${req.options.map((opt, index) => {
                        const data = results[index];
                        const courseKey = (opt.dept + opt.num).replace(/\s+/g, '');
                        
                        // CHECK LOGIC: Is this specific course already finished?
                        const isFinished = completed.includes(courseKey);
                        
                        // PREREQ LOGIC: Grab from first section
                        const prereqText = data?.sections?.[0]?.requirements?.[0]?.description || null;
                        const cardId = `prereq-${index}`;

                        return `
                            <div style="background: white; border-radius: 8px; border-left: 8px solid ${isFinished ? '#2e7d32' : '#d32f2f'}; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 15px; position: relative;">
                                
                                <div style="position: absolute; top: 15px; right: 15px; font-size: 20px;">
                                    ${isFinished ? '✅' : '❌'}
                                </div>

                                <h3 style="margin: 0 0 5px 0; color: #333;">${opt.dept} ${opt.num}</h3>
                                <p style="font-size: 12px; font-weight: bold; color: ${isFinished ? '#2e7d32' : '#d32f2f'}; margin-bottom: 10px;">
                                    ${isFinished ? 'COMPLETED / IN-PROGRESS' : 'NOT YET MET'}
                                </p>

                                ${prereqText ? `
                                    <button onclick="const e = document.getElementById('${cardId}'); e.style.display = e.style.display === 'none' ? 'block' : 'none';" 
                                            style="background: #ffcc33; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; color: #7a0019; margin-bottom: 10px;">
                                        VIEW PREREQS
                                    </button>
                                    <div id="${cardId}" style="display: none; background: #fffde7; border: 1px solid #ffe082; padding: 8px; border-radius: 4px; font-size: 11px; margin-bottom: 10px; color: #5d4037;">
                                        <strong>Requirements:</strong><br>${prereqText}
                                    </div>
                                ` : ''}

                                <div style="display: flex; gap: 10px; margin-top: auto;">
                                    <a href="https://schedulebuilder.umn.edu/explore/2026Spring/${opt.dept}/${opt.num}" target="_blank" style="flex: 1; text-align: center; font-size: 12px; padding: 8px; background: #7a0019; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Schedule</a>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    processPanel: (panel) => {
        if (panel.dataset.plusProcessed) return;
        panel.dataset.plusProcessed = "true";
        // Result badging logic remains same...
    }
};

BUILDER_UI.init();