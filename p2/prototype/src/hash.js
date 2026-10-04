export async function sha256(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUUID() {
    return crypto.randomUUID();
}

export async function computeChainHash(prevHash, electionId, index, commit, castAt) {
    const data = `${prevHash}|${electionId}|${index}|${commit}|${castAt}`;
    return await sha256(data);
}

export async function computeSnapshotHash(chainHead, ballotCount, closedAt) {
    const data = `${chainHead}|${ballotCount}|${closedAt}`;
    return await sha256(data);
}
