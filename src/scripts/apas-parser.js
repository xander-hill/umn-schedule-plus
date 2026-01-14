const APAS_SCRAPER = {
    init: () => {
        // UI Button
        const btn = document.createElement('button');
        btn.id = "umn-sync-btn";
        btn.innerText = "🔄 Sync Requirements";
        Object.assign(btn.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
            padding: '12px 18px', backgroundColor: '#7a0019', color: '#ffcc33',
            border: '2px solid #ffcc33', borderRadius: '8px', fontWeight: 'bold',
            cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s'
        });

        // Hover effect
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1.0)';
        
        btn.onclick = APAS_SCRAPER.run;
        document.body.appendChild(btn);
    },

    run: () => {
        const unmetData = [];
        // Look for all subrequirement containers
        const subReqs = document.querySelectorAll('.subrequirement');

        subReqs.forEach(sub => {
            const status = sub.querySelector('.status');
            
            // Only scrape if it is Unmet (Status_NO) or In-Progress (Status_IP)
            if (status && (status.classList.contains('Status_NO') || status.classList.contains('Status_IP'))) {
                
                const title = sub.querySelector('.subreqTitle')?.innerText.trim() || "Requirement";
                const courseElements = sub.querySelectorAll('.course.draggable');
                
                const options = Array.from(courseElements).map(el => {
                    // UMN uses '1CSCI', '1MATH'. We strip the '1'.
                    let dept = el.getAttribute('department') || "";
                    if (dept.startsWith('1')) dept = dept.substring(1);
                    
                    // Get number from attribute; fallback to inner text for wildcards like '4xxx'
                    let num = el.getAttribute('number') || el.innerText.replace(dept, '').trim();
                    
                    return {
                        dept: dept.toUpperCase(),
                        number: num.toUpperCase(),
                        full: `${dept}${num}`.replace(/\s+/g, '').toUpperCase()
                    };
                });

                if (options.length > 0) {
                    unmetData.push({ title, options });
                }
            }
        });

        // Save to storage and notify user
        chrome.storage.local.set({ "unmetRequirements": unmetData }, () => {
            console.log("Synced Requirements:", unmetData);
            alert(`Synced ${unmetData.length} requirement categories!`);
        });
    }
};

APAS_SCRAPER.init();