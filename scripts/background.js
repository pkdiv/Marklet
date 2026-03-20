chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "saveToMarklet",
        title: "Save to Marklet",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "saveToMarklet") {
        const text = info.selectionText;
        const url = tab.url;
        const title = tab.title;
        const favicon = tab.favIconUrl;
        const savedAt = Date.now();
        const id = Date.now().toString();
        const bookmark = { id, text, url, title, favicon, savedAt };
        chrome.storage.local.get(["markletBookmarks"], (result) => {
            const bookmarks = result.markletBookmarks || [];
            bookmarks.push(bookmark);
            chrome.storage.local.set({ markletBookmarks: bookmarks });
        });
    }
});

