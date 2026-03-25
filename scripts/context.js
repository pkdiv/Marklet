chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "jumpToBookmark") {
        const found = findAndScrollToText(message.text);
        sendResponse({ found });
    }
});


function findAndScrollToText(searchText) {
    const normalizedSearch = normalizeText(searchText);
    if (!normalizedSearch) return false;

    const rangeFromNodes = findRangeAcrossTextNodes(normalizedSearch);
    if (rangeFromNodes) {
        scrollAndHighlight(rangeFromNodes);
        return true;
    }

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
        const rawText = node.textContent || "";
        const index = rawText.indexOf(searchText);

        if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + searchText.length);
            scrollAndHighlight(range);
            return true;
        }
    }

    return false;
}

function scrollAndHighlight(range) {
    window.scrollTo({
        top: range.getBoundingClientRect().top + window.scrollY - 120,
        behavior: "smooth"
    });
    highlightRange(range);
}

function normalizeText(text) {
    return (text || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function findRangeAcrossTextNodes(normalizedSearch) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    const nodeStarts = [];
    let combined = "";
    let node;

    while ((node = walker.nextNode())) {
        if (!node.textContent || !node.textContent.trim()) continue;
        nodes.push(node);
        nodeStarts.push(combined.length);
        combined += node.textContent + " ";
    }

    const normalizedCombined = normalizeText(combined);
    const matchStart = normalizedCombined.indexOf(normalizedSearch);
    if (matchStart === -1) return null;

    const mapping = buildNormalizedToRawMap(combined);
    const rawStart = mapping[matchStart];
    const rawEnd = mapping[matchStart + normalizedSearch.length - 1] + 1;
    if (rawStart == null || rawEnd == null) return null;

    const startPos = toNodeOffset(rawStart, nodes, nodeStarts);
    const endPos = toNodeOffset(rawEnd, nodes, nodeStarts);
    if (!startPos || !endPos) return null;

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    return range;
}

function buildNormalizedToRawMap(rawText) {
    const map = [];
    let prevWasSpace = true;

    for (let i = 0; i < rawText.length; i++) {
        const ch = rawText[i] === "\u00a0" ? " " : rawText[i];
        if (/\s/.test(ch)) {
            if (!prevWasSpace) {
                map.push(i);
                prevWasSpace = true;
            }
        } else {
            map.push(i);
            prevWasSpace = false;
        }
    }

    if (map.length && /\s/.test(rawText[map[map.length - 1]])) {
        map.pop();
    }

    return map;
}

function toNodeOffset(rawIndex, nodes, nodeStarts) {
    for (let i = 0; i < nodes.length; i++) {
        const start = nodeStarts[i];
        const end = start + nodes[i].textContent.length;
        if (rawIndex <= end) {
            return {
                node: nodes[i],
                offset: Math.max(0, Math.min(rawIndex - start, nodes[i].textContent.length))
            };
        }
    }

    if (nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        return { node: last, offset: last.textContent.length };
    }

    return null;
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