/**
 * El Paso Verse - Wallet Connection & NFT Verification
 * Integrates with Book.io NFT collection for Gazette access
 */

// El Paso Verse NFT Collection Details
const EPV_COLLECTION = {
    // TODO: Replace with actual Book.io contract address
    contractAddress: '0x...', // Book.io El Paso Verse collection
    chainId: 1, // Ethereum mainnet (adjust if on different chain)
    name: 'El Paso Verse Genesis Collection'
};

// Wallet state
let walletConnected = false;
let walletAddress = null;
let hasNFT = false;
let nftCount = 0;

/**
 * Initialize wallet connection on page load
 */
function initWallet() {
    // Check if already connected
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress && window.ethereum) {
        checkConnection(savedAddress);
    }

    updateWalletUI();
}

/**
 * Connect wallet (MetaMask or WalletConnect)
 */
async function connectWallet() {
    try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
            alert('Please install MetaMask or another Web3 wallet to connect.');
            window.open('https://metamask.io/download/', '_blank');
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
            alert('No accounts found. Please unlock your wallet.');
            return;
        }

        walletAddress = accounts[0];
        walletConnected = true;

        // Save to localStorage
        localStorage.setItem('walletAddress', walletAddress);

        // Check for NFT ownership
        await checkNFTOwnership();

        // Update UI
        updateWalletUI();

        console.log('Wallet connected:', walletAddress);

    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
    walletAddress = null;
    walletConnected = false;
    hasNFT = false;
    nftCount = 0;

    localStorage.removeItem('walletAddress');
    localStorage.removeItem('nftVerified');

    updateWalletUI();

    console.log('Wallet disconnected');
}

/**
 * Check if wallet is already connected
 */
async function checkConnection(address) {
    try {
        const accounts = await window.ethereum.request({
            method: 'eth_accounts'
        });

        if (accounts.includes(address)) {
            walletAddress = address;
            walletConnected = true;
            await checkNFTOwnership();
            updateWalletUI();
        } else {
            // Clear saved address if not connected
            localStorage.removeItem('walletAddress');
        }
    } catch (error) {
        console.error('Error checking connection:', error);
    }
}

/**
 * Check if connected wallet owns El Paso Verse NFTs
 */
async function checkNFTOwnership() {
    if (!walletAddress) return;

    try {
        // TODO: Implement actual NFT verification
        // This is a placeholder - replace with actual Book.io API or blockchain query

        // For demo purposes, we'll simulate NFT ownership
        // In production, you would:
        // 1. Query Book.io API for NFT ownership
        // 2. Or query blockchain directly using Web3.js/Ethers.js

        console.log('Checking NFT ownership for:', walletAddress);

        // DEMO MODE: Simulate having NFTs
        // Remove this and implement actual verification
        const demoHasNFT = true;
        const demoNFTCount = 3;

        if (demoHasNFT) {
            hasNFT = true;
            nftCount = demoNFTCount;
            localStorage.setItem('nftVerified', 'true');
            console.log('NFT ownership verified:', nftCount, 'NFTs found');
        } else {
            hasNFT = false;
            nftCount = 0;
            localStorage.removeItem('nftVerified');
            console.log('No NFTs found');
        }

        updateWalletUI();

    } catch (error) {
        console.error('Error checking NFT ownership:', error);
        hasNFT = false;
        nftCount = 0;
    }
}

/**
 * Update wallet UI elements
 */
function updateWalletUI() {
    // Update connect button
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const nftStatus = document.getElementById('nftStatus');

    if (connectBtn) {
        if (walletConnected) {
            connectBtn.textContent = 'Disconnect Wallet';
            connectBtn.onclick = disconnectWallet;
        } else {
            connectBtn.textContent = 'Connect Wallet';
            connectBtn.onclick = connectWallet;
        }
    }

    // Update wallet info display
    if (walletInfo) {
        if (walletConnected) {
            const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            walletInfo.innerHTML = `
                <div style="color: #f9f3e3; margin-bottom: 0.5rem;">
                    <strong>Connected:</strong> ${shortAddress}
                </div>
            `;
            walletInfo.style.display = 'block';
        } else {
            walletInfo.style.display = 'none';
        }
    }

    // Update NFT status
    if (nftStatus) {
        if (walletConnected) {
            if (hasNFT) {
                nftStatus.innerHTML = `
                    <div style="background: #1a5f1a; border: 2px solid #2d8a2d; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
                        <div style="color: #90ee90; font-weight: 700; margin-bottom: 0.5rem;">✓ NFT Verified</div>
                        <div style="color: #d0f0d0; font-size: 0.9rem;">
                            You own ${nftCount} El Paso Verse NFT${nftCount !== 1 ? 's' : ''} from Book.io
                            <br>You have access to exclusive content!
                        </div>
                    </div>
                `;
            } else {
                nftStatus.innerHTML = `
                    <div style="background: #5f1a1a; border: 2px solid #8a2d2d; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
                        <div style="color: #ff9090; font-weight: 700; margin-bottom: 0.5rem;">No NFTs Found</div>
                        <div style="color: #f0d0d0; font-size: 0.9rem;">
                            Purchase El Paso Verse NFTs on <a href="https://book.io/series/el-paso-verse/" target="_blank" style="color: #c9a860; text-decoration: underline;">Book.io</a> to unlock exclusive content.
                        </div>
                    </div>
                `;
            }
        } else {
            nftStatus.innerHTML = '';
        }
    }
}

/**
 * Check if user has NFT access (for Gazette gate)
 */
function hasNFTAccess() {
    return walletConnected && hasNFT;
}

/**
 * Get wallet address
 */
function getWalletAddress() {
    return walletAddress;
}

/**
 * Get NFT count
 */
function getNFTCount() {
    return nftCount;
}

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (accounts[0] !== walletAddress) {
            walletAddress = accounts[0];
            localStorage.setItem('walletAddress', walletAddress);
            checkNFTOwnership();
        }
    });

    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', initWallet);
}
