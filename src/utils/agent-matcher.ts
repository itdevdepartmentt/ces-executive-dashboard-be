export function isSmartMatch(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return true;

  const tokens1 = n1.split(/\s+/);
  const tokens2 = n2.split(/\s+/);

  // If word count is different, it might not be a simple abbreviation match.
  // For now, we enforce same word count as per the approved plan.
  if (tokens1.length !== tokens2.length) {
    return false;
  }

  for (let i = 0; i < tokens1.length; i++) {
    const t1 = tokens1[i].replace(/\./g, '');
    const t2 = tokens2[i].replace(/\./g, '');

    if (t1 === t2) continue;

    // Check abbreviation (e.g. 'k' vs 'krysostomus')
    if (t1.length === 1 && t2.startsWith(t1)) continue;
    if (t2.length === 1 && t1.startsWith(t2)) continue;

    // If no match rule applies, the names don't match
    return false;
  }

  return true;
}

/**
 * Searches for a smart match of searchName within a Map of knownAgents.
 * Returns the matched value, or undefined if not found.
 */
export function findAgentMatch<T>(searchName: string, knownAgents: Map<string, T>): T | undefined {
  const normalized = searchName.toLowerCase().trim();
  
  // 1. Try exact match first
  if (knownAgents.has(normalized)) {
    return knownAgents.get(normalized);
  }

  // 2. Try smart match
  for (const [knownName, value] of knownAgents.entries()) {
    if (isSmartMatch(searchName, knownName)) {
      return value;
    }
  }

  return undefined;
}
