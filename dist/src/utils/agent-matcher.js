"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSmartMatch = isSmartMatch;
exports.findAgentMatch = findAgentMatch;
function isSmartMatch(name1, name2) {
    if (!name1 || !name2)
        return false;
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    if (n1 === n2)
        return true;
    const tokens1 = n1.split(/\s+/);
    const tokens2 = n2.split(/\s+/);
    if (tokens1.length !== tokens2.length) {
        return false;
    }
    for (let i = 0; i < tokens1.length; i++) {
        const t1 = tokens1[i].replace(/\./g, '');
        const t2 = tokens2[i].replace(/\./g, '');
        if (t1 === t2)
            continue;
        if (t1.length === 1 && t2.startsWith(t1))
            continue;
        if (t2.length === 1 && t1.startsWith(t2))
            continue;
        return false;
    }
    return true;
}
function findAgentMatch(searchName, knownAgents) {
    const normalized = searchName.toLowerCase().trim();
    if (knownAgents.has(normalized)) {
        return knownAgents.get(normalized);
    }
    for (const [knownName, value] of knownAgents.entries()) {
        if (isSmartMatch(searchName, knownName)) {
            return value;
        }
    }
    return undefined;
}
//# sourceMappingURL=agent-matcher.js.map