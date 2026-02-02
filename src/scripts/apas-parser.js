// src/scripts/apas-scraper.js
const APAS_SCRAPER = {
    init: () => {
        const btn = document.createElement('button');
        btn.id = "umn-plus-sync";
        btn.innerText = "🔄 Sync Academic Profile";
        Object.assign(btn.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
            padding: '12px 18px', backgroundColor: '#7a0019', color: '#ffcc33',
            border: '2px solid #ffcc33', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
        });
        btn.onclick = APAS_SCRAPER.run;
        document.body.appendChild(btn);
    },

    run: () => {
        const auditData = [];
        const mainReqs = document.querySelectorAll('.requirement');

        mainReqs.forEach(req => {
            // 1. Get the status of the OVERALL REQUIREMENT
            const overallStatusEl = req.querySelector('.status'); // This is the parent status
            const isOverallMet = overallStatusEl?.classList.contains('Status_OK');
            const isOverallIP = overallStatusEl?.classList.contains('Status_IP');
            
            const overallStatusLabel = isOverallMet ? 'MET' : (isOverallIP ? 'IP' : 'UNMET');
            const overallTitle = req.querySelector('.reqTitle')?.innerText.trim() || "Requirement";

            const subReqs = req.querySelectorAll('.subrequirement');
            subReqs.forEach(sub => {
                // Get sub-requirement data as before
                const subStatusEl = sub.querySelector('.status');
                const subStatus = subStatusEl?.classList.contains('Status_OK') ? 'MET' : 'UNMET';

                auditData.push({
                    requirementTitle: overallTitle,
                    requirementStatus: overallStatusLabel, // <--- This is what you want
                    subTitle: sub.querySelector('.subreqTitle')?.innerText.trim(),
                    subStatus: subStatus,
                    options: Array.from(sub.querySelectorAll('.course.draggable')).map(el => {
                        let dept = (el.getAttribute('department') || "").toUpperCase();
                        let num = (el.getAttribute('number') || el.innerText.replace(dept, '').trim()).toUpperCase();
                        return { dept, num };
                    })
                });
            });
        });

        chrome.storage.local.set({ "fullDegreeAudit": auditData });
    }
};
APAS_SCRAPER.init();