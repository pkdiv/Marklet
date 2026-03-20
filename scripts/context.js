chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "jumpToBookmark") {
        findAndScrollToText(message.text);
        sendResponse({ found: true });
    }
});


function findAndScrollToText(searchText) {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
        const index = node.textContent.indexOf(searchText);

        if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + searchText.length);

            window.scrollTo({
                top: range.getBoundingClientRect().top + window.scrollY - 120,
                behavior: "smooth"
            });

            highlightRange(range);

            return true;
        }
    }

    return false;
}

function highlightRange(range) {
    removePreviousHighlight();
    const mark = document.createElement("mark");
    mark.id = "hv-highlight";
    mark.style.cssText = `
    background: #e2c97e;
    color: #1a1a2e;
    border-radius: 3px;
    padding: 1px 0;
    transition: background 1.5s ease, color 1.5s ease;
  `;

    try {
        range.surroundContents(mark);
    } catch {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
    }

    setTimeout(() => {
        mark.style.background = "transparent";
        mark.style.color = "inherit";
        setTimeout(() => removePreviousHighlight(), 1500);
    }, 2000);
}

function removePreviousHighlight() {
    const existing = document.getElementById("hv-highlight");
    if (existing) {
        existing.replaceWith(...existing.childNodes);
    }
}