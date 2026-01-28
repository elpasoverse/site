# Wallet Integration & NFT Verification

## Overview

The El Paso Verse Community Portal now includes wallet connection functionality that verifies ownership of Genesis Collection NFTs from Book.io. NFT holders get automatic access to exclusive content, including The El Paso Gazette.

## How It Works

### 1. Connect Wallet Section
Located at the top of the **Exclusive Content** tab, users can:
- Connect their Web3 wallet (MetaMask, WalletConnect, etc.)
- View their connected wallet address
- See their NFT verification status
- Get links to purchase NFTs on Book.io

### 2. Access Methods
Users can access the Gazette through two methods:
- **PASO Tokens:** 1 PASO = 24-hour access
- **Genesis NFTs:** Permanent access for NFT holders

### 3. NFT Verification
When a wallet is connected:
1. System checks for El Paso Verse NFTs
2. If NFTs found → Grant permanent access
3. Status displayed with NFT count
4. Access automatically granted when viewing Gazette

## Current Status: Demo Mode

**IMPORTANT:** The NFT verification is currently in **DEMO MODE**.

### What Demo Mode Does:
- Simulates NFT ownership when any wallet connects
- Shows "3 NFTs found" for testing purposes
- Grants access to test the user experience

### To Implement Real NFT Verification:

#### Option 1: Book.io API (Recommended)
```javascript
// In wallet-connect.js, replace the demo code with:
async function checkNFTOwnership() {
    const response = await fetch(`https://api.book.io/v1/nfts/${walletAddress}`);
    const data = await response.json();

    // Filter for El Paso Verse collection
    const epvNFTs = data.nfts.filter(nft =>
        nft.collection === 'el-paso-verse-genesis'
    );

    hasNFT = epvNFTs.length > 0;
    nftCount = epvNFTs.length;
}
```

#### Option 2: Direct Blockchain Query (Web3.js/Ethers.js)
```javascript
// Using Ethers.js
import { ethers } from 'ethers';

async function checkNFTOwnership() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
        EPV_COLLECTION.contractAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
    );

    const balance = await contract.balanceOf(walletAddress);
    hasNFT = balance.toNumber() > 0;
    nftCount = balance.toNumber();
}
```

## Configuration Required

### 1. Update Contract Address
In `wallet-connect.js`, replace placeholder with actual address:
```javascript
const EPV_COLLECTION = {
    contractAddress: '0xYOUR_ACTUAL_CONTRACT_ADDRESS',
    chainId: 1, // Or appropriate chain
    name: 'El Paso Verse Genesis Collection'
};
```

### 2. Choose Verification Method
Decide between:
- **Book.io API** - Easier, relies on their indexing
- **Direct Blockchain** - More decentralized, requires Web3 library

### 3. Install Dependencies (if using Web3)
```bash
npm install ethers
# or
npm install web3
```

## User Experience Flow

### For NFT Holders:
1. Click "Connect Wallet" in Community Portal
2. Approve MetaMask connection
3. See "✓ NFT Verified" status with count
4. Click "Read The Gazette" → Instant access
5. Access remains permanent while wallet connected

### For PASO Users:
1. Click "Verify Access" at Gazette gate
2. System checks both NFT and PASO
3. If 1+ PASO → Grant 24-hour access
4. If no PASO/NFT → See purchase options

## Security Considerations

### Current Implementation:
- ✅ Wallet connection through MetaMask
- ✅ Address stored in localStorage (client-side)
- ✅ NFT verification cached locally
- ⚠️ Demo mode simulates ownership

### Production Recommendations:
1. **Server-side verification** for critical access control
2. **Rate limiting** on verification checks
3. **Clear localStorage** on wallet disconnect
4. **Wallet signature** verification for authenticity
5. **Multiple chain support** if NFTs on different networks

## Testing the Feature

### Demo Mode Testing:
1. Open Community Portal (members.html)
2. Go to "Exclusive Content" tab
3. Click "Connect Wallet"
4. Approve MetaMask connection
5. See "✓ NFT Verified - 3 NFTs found"
6. Click Gazette link → Automatic access

### Real Implementation Testing:
1. Replace demo code with actual verification
2. Test with wallet that **owns** NFTs
3. Test with wallet that **doesn't own** NFTs
4. Verify correct access granted/denied
5. Test disconnect/reconnect flow

## Files Modified

- `wallet-connect.js` - New file for wallet logic
- `members.html` - Added wallet connection UI
- `gazette-v2.html` - Updated PASO gate to check NFTs
- `WALLET-INTEGRATION.md` - This documentation

## Next Steps for Production

- [ ] Get actual Book.io contract address
- [ ] Implement real NFT verification
- [ ] Add loading states during verification
- [ ] Add error handling for network issues
- [ ] Test on multiple chains if needed
- [ ] Add analytics for wallet connections
- [ ] Consider multi-wallet support (Coinbase, etc.)

## Support

For questions about:
- **Book.io integration:** Contact Book.io support
- **Smart contracts:** Review Book.io documentation
- **Implementation:** Check this guide or code comments

---

**Status:** ✅ Demo mode ready for testing
**Production Ready:** ⚠️ Requires real NFT verification implementation
