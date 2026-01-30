/**
 * El Paso Verse - Cardano Wallet Connection
 * Connects to Cardano wallets (Begin, Nami, Eternl, etc.) for PASO balance & NFT verification
 */

// PASO Token Configuration
const PASO_CONFIG = {
    policyId: '0b0d0c5a1acd08efde911a8466fc1bbd5b09d2de87b2ccb809d64b01',
    assetName: '5041534f', // "PASO" in hex
    decimals: 0
};

// Wallet state
let walletConnected = false;
let walletAddress = null;
let walletApi = null;
let pasoBalance = 0;
let hasNFT = false;
let nftCount = 0;

// Supported Cardano wallets (id must match window.cardano property)
const SUPPORTED_WALLETS = [
    { id: 'begin', name: 'Begin' },
    { id: 'nami', name: 'Nami' },
    { id: 'eternl', name: 'Eternl' },
    { id: 'flint', name: 'Flint' },
    { id: 'typhon', name: 'Typhon' },
    { id: 'yoroi', name: 'Yoroi' },
    { id: 'lace', name: 'Lace' },
    { id: 'gerowallet', name: 'Gero' },
    { id: 'nufi', name: 'NuFi' }
];

/**
 * Get available Cardano wallets with their icons
 */
function getAvailableWallets() {
    const available = [];
    if (typeof window.cardano !== 'undefined') {
        SUPPORTED_WALLETS.forEach(wallet => {
            if (window.cardano[wallet.id]) {
                // Get the actual icon from the wallet extension
                const walletInfo = window.cardano[wallet.id];
                available.push({
                    id: wallet.id,
                    name: walletInfo.name || wallet.name,
                    icon: walletInfo.icon || null
                });
            }
        });
    }
    return available;
}

/**
 * Initialize wallet on page load
 */
async function initWallet() {
    const savedWallet = localStorage.getItem('cardanoWallet');
    const savedAddress = localStorage.getItem('walletAddress');

    if (savedWallet && savedAddress) {
        // Try to reconnect to previously connected wallet
        await reconnectWallet(savedWallet);
    }

    updateWalletUI();
}

/**
 * Show wallet selection modal
 */
function showWalletSelector() {
    const available = getAvailableWallets();

    if (available.length === 0) {
        alert('No Cardano wallet found. Please install Begin, Nami, or another Cardano wallet.\n\nRecommended: Begin Wallet (begin.is)');
        window.open('https://begin.is', '_blank');
        return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'walletSelectorModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    let walletButtons = available.map(w => `
        <button onclick="connectWallet('${w.id}')" style="
            display: flex;
            align-items: center;
            gap: 1rem;
            width: 100%;
            padding: 1rem 1.5rem;
            margin-bottom: 0.75rem;
            background: #2a2a2a;
            border: 1px solid #C9A961;
            color: #F5E6D3;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s;
        " onmouseover="this.style.background='#3a3a3a'" onmouseout="this.style.background='#2a2a2a'">
            <img src="${w.icon}" alt="${w.name}" style="width: 32px; height: 32px; border-radius: 6px;">
            <span>${w.name}</span>
        </button>
    `).join('');

    modal.innerHTML = `
        <div style="
            background: #1a1a1a;
            border: 2px solid #C9A961;
            border-radius: 8px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
        ">
            <h3 style="
                font-family: 'Playfair Display', Georgia, serif;
                color: #C9A961;
                margin: 0 0 1.5rem 0;
                text-align: center;
            ">Connect Wallet</h3>
            ${walletButtons}
            <button onclick="closeWalletSelector()" style="
                width: 100%;
                padding: 0.75rem;
                background: transparent;
                border: 1px solid #666;
                color: #999;
                cursor: pointer;
                margin-top: 0.5rem;
            ">Cancel</button>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Close wallet selector modal
 */
function closeWalletSelector() {
    const modal = document.getElementById('walletSelectorModal');
    if (modal) modal.remove();
}

/**
 * Connect to a specific Cardano wallet
 */
async function connectWallet(walletId) {
    closeWalletSelector();

    try {
        if (!window.cardano || !window.cardano[walletId]) {
            alert(`${walletId} wallet not found. Please make sure it's installed and enabled.`);
            return;
        }

        // Enable the wallet (request permission)
        walletApi = await window.cardano[walletId].enable();

        // Get wallet address
        const addresses = await walletApi.getUsedAddresses();
        if (addresses.length === 0) {
            const unusedAddresses = await walletApi.getUnusedAddresses();
            walletAddress = unusedAddresses[0];
        } else {
            walletAddress = addresses[0];
        }

        walletConnected = true;

        // Save connection
        localStorage.setItem('cardanoWallet', walletId);
        localStorage.setItem('walletAddress', walletAddress);

        // Get PASO balance
        await getPasoBalance();

        // Update UI
        updateWalletUI();

        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('walletConnected', {
            detail: { address: walletAddress, balance: pasoBalance }
        }));

        console.log('Wallet connected:', walletId, walletAddress);

    } catch (error) {
        console.error('Error connecting wallet:', error);
        if (error.code === -3) {
            alert('Connection rejected. Please approve the connection request in your wallet.');
        } else {
            alert('Failed to connect wallet. Please try again.');
        }
    }
}

/**
 * Reconnect to previously connected wallet
 */
async function reconnectWallet(walletId) {
    try {
        if (window.cardano && window.cardano[walletId]) {
            const isEnabled = await window.cardano[walletId].isEnabled();
            if (isEnabled) {
                walletApi = await window.cardano[walletId].enable();
                walletConnected = true;
                walletAddress = localStorage.getItem('walletAddress');
                await getPasoBalance();
                updateWalletUI();
            }
        }
    } catch (error) {
        console.error('Error reconnecting wallet:', error);
        disconnectWallet();
    }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
    walletApi = null;
    walletAddress = null;
    walletConnected = false;
    pasoBalance = 0;
    hasNFT = false;
    nftCount = 0;

    localStorage.removeItem('cardanoWallet');
    localStorage.removeItem('walletAddress');

    updateWalletUI();

    window.dispatchEvent(new CustomEvent('walletDisconnected'));

    console.log('Wallet disconnected');
}

/**
 * Get PASO token balance from wallet
 */
async function getPasoBalance() {
    if (!walletApi || !PASO_CONFIG.policyId) {
        pasoBalance = 0;
        return;
    }

    try {
        // Try getting balance which includes all assets
        const balanceHex = await walletApi.getBalance();
        console.log('Raw balance hex:', balanceHex);

        // Search for our policy ID in the balance
        if (balanceHex && balanceHex.includes(PASO_CONFIG.policyId)) {
            // Policy ID found - try to extract amount
            pasoBalance = extractPasoFromBalance(balanceHex);
            console.log('PASO balance found:', pasoBalance);
        } else {
            // Try UTXOs as fallback
            const utxos = await walletApi.getUtxos();
            console.log('UTXOs count:', utxos ? utxos.length : 0);

            if (utxos && utxos.length > 0) {
                let total = 0;
                for (const utxo of utxos) {
                    if (utxo.includes(PASO_CONFIG.policyId)) {
                        total += extractPasoFromBalance(utxo);
                    }
                }
                pasoBalance = total;
            } else {
                pasoBalance = 0;
            }
        }

        console.log('Final PASO balance:', pasoBalance);

    } catch (error) {
        console.error('Error getting PASO balance:', error);
        pasoBalance = 0;
    }
}

/**
 * Extract PASO amount from hex data
 * Searches for policy ID and extracts the following amount
 */
function extractPasoFromBalance(hex) {
    try {
        const policyIndex = hex.indexOf(PASO_CONFIG.policyId);
        if (policyIndex === -1) return 0;

        // After policy ID (56 chars) comes asset name length + asset name + amount
        const afterPolicy = hex.substring(policyIndex + PASO_CONFIG.policyId.length);
        console.log('After policy ID:', afterPolicy.substring(0, 40));

        // Look for our asset name
        const assetIndex = afterPolicy.indexOf(PASO_CONFIG.assetName);
        if (assetIndex === -1) {
            // Asset name not found with exact match, try to find amount after policy
            return extractCborInt(afterPolicy);
        }

        // Get data after asset name
        const afterAsset = afterPolicy.substring(assetIndex + PASO_CONFIG.assetName.length);
        console.log('After asset name:', afterAsset.substring(0, 20));

        return extractCborInt(afterAsset);

    } catch (e) {
        console.error('Error extracting PASO:', e);
        return 0;
    }
}

/**
 * Extract CBOR-encoded integer from hex string
 */
function extractCborInt(hex) {
    if (!hex || hex.length < 2) return 0;

    const firstByte = parseInt(hex.substring(0, 2), 16);

    // CBOR unsigned integers (major type 0)
    if (firstByte <= 23) {
        return firstByte;
    }
    if (firstByte === 24 && hex.length >= 4) {
        return parseInt(hex.substring(2, 4), 16);
    }
    if (firstByte === 25 && hex.length >= 6) {
        return parseInt(hex.substring(2, 6), 16);
    }
    if (firstByte === 26 && hex.length >= 10) {
        return parseInt(hex.substring(2, 10), 16);
    }
    if (firstByte === 27 && hex.length >= 18) {
        // 8-byte integer (for large numbers like 1 billion)
        return parseInt(hex.substring(2, 18), 16);
    }

    // CBOR major type 1b prefix for 8-byte uint
    if (firstByte === 0x1b && hex.length >= 18) {
        return parseInt(hex.substring(2, 18), 16);
    }

    return 0;
}

/**
 * Format address for display
 */
function formatAddress(address) {
    if (!address) return '';
    // Cardano addresses are long - show first 8 and last 6
    if (address.length > 20) {
        return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }
    return address;
}

/**
 * Update wallet UI elements
 */
function updateWalletUI() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const nftStatus = document.getElementById('nftStatus');
    const pasoBalanceEl = document.getElementById('pasoBalance');

    if (connectBtn) {
        if (walletConnected) {
            connectBtn.textContent = 'Disconnect Wallet';
            connectBtn.onclick = disconnectWallet;
        } else {
            connectBtn.textContent = 'Connect Cardano Wallet';
            connectBtn.onclick = showWalletSelector;
        }
    }

    if (walletInfo) {
        if (walletConnected) {
            walletInfo.innerHTML = `
                <div style="color: #90ee90; font-weight: 600; margin-bottom: 0.5rem;">✓ Wallet Connected</div>
                <div style="color: #a89a8a; font-size: 0.9rem;">${formatAddress(walletAddress)}</div>
            `;
            walletInfo.style.display = 'block';
        } else {
            walletInfo.style.display = 'none';
        }
    }

    if (pasoBalanceEl) {
        console.log('Updating balance display. walletConnected:', walletConnected, 'pasoBalance:', pasoBalance);
        if (walletConnected) {
            pasoBalanceEl.textContent = pasoBalance.toLocaleString();
            console.log('Set balance to:', pasoBalanceEl.textContent);
        } else {
            pasoBalanceEl.textContent = '—';
        }
    } else {
        console.log('pasoBalanceEl not found!');
    }

    // Update NFT status if element exists
    if (nftStatus) {
        if (walletConnected) {
            nftStatus.innerHTML = `
                <div style="color: #a89a8a; font-size: 0.9rem; margin-top: 1rem;">
                    NFT verification coming soon
                </div>
            `;
        } else {
            nftStatus.innerHTML = '';
        }
    }
}

/**
 * Check if wallet is connected
 */
function isWalletConnected() {
    return walletConnected;
}

/**
 * Get current PASO balance
 */
function getPasoTokenBalance() {
    return pasoBalance;
}

/**
 * Get wallet address
 */
function getWalletAddress() {
    return walletAddress;
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', initWallet);
}
