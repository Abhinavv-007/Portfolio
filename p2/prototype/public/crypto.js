/**
 * Client-side crypto utilities using SubtleCrypto API
 */

/**
 * Compute SHA256 hash of input string
 * @param {string} data - Input string to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
async function sha256(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random hex token (32 bytes = 64 hex chars)
 * @returns {string} Random hex string
 */
function generateToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random nonce (16 bytes = 32 hex chars)
 * @returns {string} Random hex string
 */
function generateNonce() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute chain hash for client-side verification
 * @param {string} prevHash - Previous chain head
 * @param {string} electionId - Election ID
 * @param {number} index - Ballot index
 * @param {string} commit - Ballot commit hash
 * @param {string} castAt - ISO timestamp
 * @returns {Promise<string>} Hex-encoded chain hash
 */
async function computeChainHash(prevHash, electionId, index, commit, castAt) {
    const data = `${prevHash}|${electionId}|${index}|${commit}|${castAt}`;
    return sha256(data);
}

// Export for use in app.js
window.Crypto = {
    sha256,
    generateToken,
    generateNonce,
    computeChainHash
};
