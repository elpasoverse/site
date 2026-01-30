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

// Supported Cardano wallets
const SUPPORTED_WALLETS = [
    { id: 'begin', name: 'Begin', icon: '🌅' },
    { id: 'nami', name: 'Nami', icon: '🔮' },
    { id: 'eternl', name: 'Eternl', icon: '♾️' },
    { id: 'flint', name: 'Flint', icon: '🔥' },
    { id: 'typhon', name: 'Typhon', icon: '🌀' },
    { id: 'yoroi', name: 'Yoroi', icon: '📱' },
    { id: 'lace', name: 'Lace', icon: '💎' }
];

/**
 * Get available Cardano wallets
 */
function getAvailableWallets() {
    const available = [];
    if (typeof window.cardano !== 'undefined') {
        SUPPORTED_WALLETS.forEach(wallet => {
            if (window.cardano[wallet.id]) {
                available.push(wallet);
            }
        });
    }
    return available;
}

/**
 * Initialize wallet on page load
 */
function initWallet() {
    const savedWallet = localStorage.getItem('cardanoWallet');
    const savedAddress = localStorage.getItem('walletAddress');

    if (savedWallet && savedAddress) {
        // Try to reconnect to previously connected wallet
        reconnectWallet(savedWallet);
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
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s;
        " onmouseover="this.style.background='#3a3a3a'" onmouseout="this.style.background='#2a2a2a'">
            <span style="font-size: 1.5rem;">${w.icon}</span>
            <span>${w.name}</span>
        </button>
    `).join('');

    modal.innerHTML = `
        <div style="
            background: #1a1a1a;
            border: 2px solid #C9A961;
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
 * Get PASO token balance from wallet UTXOs
 */
async function getPasoBalance() {
    if (!walletApi || !PASO_CONFIG.policyId) {
        pasoBalance = 0;
        return;
    }

    try {
        // Get all UTXOs from wallet
        const utxos = await walletApi.getUtxos();

        if (!utxos || utxos.length === 0) {
            pasoBalance = 0;
            return;
        }

        // Asset ID is policyId + assetName concatenated
        const pasoAssetId = PASO_CONFIG.policyId + PASO_CONFIG.assetName;
        let totalPaso = 0;

        // Search through UTXOs for PASO tokens
        for (const utxo of utxos) {
            // Check if this UTXO contains our PASO token
            if (utxo.includes(pasoAssetId)) {
                // Found PASO in this UTXO - extract amount
                // CBOR parsing would be needed for exact amount
                // For now, increment count (basic detection)
                totalPaso += extractTokenAmount(utxo, pasoAssetId);
            }
        }

        pasoBalance = totalPaso;
        console.log('PASO balance:', pasoBalance);

    } catch (error) {
        console.error('Error getting PASO balance:', error);
        pasoBalance = 0;
    }
}

/**
 * Extract token amount from UTXO hex (simplified parser)
 * Full implementation would use proper CBOR decoding
 */
function extractTokenAmount(utxoHex, assetId) {
    try {
        // Find the asset in the UTXO
        const assetIndex = utxoHex.indexOf(assetId);
        if (assetIndex === -1) return 0;

        // The amount typically follows the asset name in CBOR
        // For tokens with small amounts, it's often encoded as a single byte
        // This is a simplified extraction - works for most common cases
        const afterAsset = utxoHex.substring(assetIndex + assetId.length);

        // Try to extract a simple integer value
        // CBOR encodes small integers (0-23) directly
        // Larger integers have type prefix
        if (afterAsset.length >= 2) {
            const firstByte = parseInt(afterAsset.substring(0, 2), 16);

            // CBOR major type 0 (unsigned int) values 0-23 are encoded directly
            if (firstByte <= 23) {
                return firstByte;
            }
            // 24 = 1 byte follows, 25 = 2 bytes follow, etc.
            if (firstByte === 24 && afterAsset.length >= 4) {
                return parseInt(afterAsset.substring(2, 4), 16);
            }
            if (firstByte === 25 && afterAsset.length >= 6) {
                return parseInt(afterAsset.substring(2, 6), 16);
            }
            if (firstByte === 26 && afterAsset.length >= 10) {
                return parseInt(afterAsset.substring(2, 10), 16);
            }
        }

        // If we found the asset but couldn't parse amount, assume at least 1
        return 1;
    } catch (e) {
        console.error('Error parsing token amount:', e);
        return 0;
    }
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
        if (walletConnected) {
            pasoBalanceEl.textContent = pasoBalance.toLocaleString();
        } else {
            pasoBalanceEl.textContent = '—';
        }
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
