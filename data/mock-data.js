const mockUnmetReqs = [
    {
        title: "Upper Division Core",
        options: ["CSCI 4041", "CSCI 4061", "CSCI 4511W"]
    },
    {
        title: "Science Core",
        options: ["PHYS 1301W", "CHEM 1061"]
    }
];

chrome.storage.local.set({ "unmetRequirements": mockUnmetReqs }, () => {
    console.log("Mock data injected. You can now test the Schedule Builder highlighter.");
});