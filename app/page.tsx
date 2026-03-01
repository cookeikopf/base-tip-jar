'use client';

import { useState, useEffect, useCallback } from 'react';

const CREATOR_ADDRESS = '0x1234567890123456789012345678901234567890';

export default function TipJar() {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [tipAmount, setTipAmount] = useState('0.01');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    
    const eth = (window as any).ethereum;
    if (!eth) return;

    // Check existing connection
    eth.request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts?.length > 0) {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
        }
      })
      .catch(() => {});
  }, []);

  const updateBalance = useCallback(async (addr: string) => {
    if (typeof window === 'undefined') return;
    const eth = (window as any).ethereum;
    if (!eth) return;
    
    try {
      const bal = await eth.request({ method: 'eth_getBalance', params: [addr, 'latest'] });
      const wei = parseInt(bal, 16);
      setBalance((wei / 1e18).toFixed(4));
    } catch {}
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined') return;
    
    // Get ethereum provider - handle multiple wallets
    const win = window as any;
    let eth = win.ethereum;
    
    if (!eth) {
      setStatus('No wallet found. Install MetaMask.');
      return;
    }

    // If multiple wallets (array), use the first one or find MetaMask
    if (win.ethereum.providers?.length > 0) {
      eth = win.ethereum.providers.find((p: any) => p.isMetaMask) || win.ethereum.providers[0];
    }

    setStatus('Connecting...');

    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      
      if (accounts?.length > 0) {
        setAccount(accounts[0]);
        await updateBalance(accounts[0]);
        setStatus('Connected!');
        setTimeout(() => setStatus(''), 2000);
      }
    } catch (err: any) {
      console.error('Wallet error:', err);
      if (err.code === 4001) {
        setStatus('Connection rejected');
      } else {
        setStatus(`Error: ${err.message || 'Check console'}`);
      }
    }
  };

  const sendTip = async () => {
    if (!account) {
      await connectWallet();
      return;
    }

    if (typeof window === 'undefined') return;
    const win = window as any;
    let eth = win.ethereum;
    
    if (win.ethereum?.providers?.length > 0) {
      eth = win.ethereum.providers.find((p: any) => p.isMetaMask) || win.ethereum.providers[0];
    }

    setIsLoading(true);
    setStatus('Preparing transaction...');

    try {
      const weiValue = BigInt(Math.floor(parseFloat(tipAmount) * 1e18));
      
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: CREATOR_ADDRESS,
          value: '0x' + weiValue.toString(16),
        }],
      });

      setStatus('Transaction sent!');
      
      // Simple poll for receipt
      let receipt = null;
      let attempts = 0;
      while (!receipt && attempts < 20) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          receipt = await eth.request({ method: 'eth_getTransactionReceipt', params: [txHash] });
        } catch {}
        attempts++;
      }

      if (receipt) {
        setStatus('Tip sent successfully!');
        await updateBalance(account);
        setTimeout(() => setStatus(''), 3000);
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setStatus('Transaction rejected');
      } else {
        setStatus(`Error: ${err.message || 'Failed'}`);
      }
    }
    setIsLoading(false);
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!mounted) return <div className="min-h-screen bg-[#0a0a0a]" />;

  const hasWallet = typeof window !== 'undefined' && !!(window as any).ethereum;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
      </div>

      <nav className="relative z-10 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0052FF] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                </svg>
              </div>
              <span className="font-semibold text-lg">BaseTip</span>
            </div>

            {account ? (
              <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {formatAddress(account)}
              </button>
            ) : (
              <button 
                onClick={connectWallet}
                className="px-4 py-2 rounded-full bg-[#0052FF] hover:bg-blue-600 transition text-sm font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-16 md:py-24">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
              Support creators<span className="text-[#0052FF]">.</span>
            </h1>
            <p className="text-gray-400">
              Send tips directly to any wallet. Zero fees. Instant settlement.
            </p>
          </div>

          {!hasWallet && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm">
              <p className="font-medium mb-1">No wallet detected</p>
              <p>Install <a href="https://metamask.io" target="_blank" rel="noopener" className="underline">MetaMask</a> to use this app.</p>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-b from-blue-500/20 to-purple-500/20 px-6 py-10 text-center border-b border-white/10">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-3xl">
                🎨
              </div>
              <h2 className="text-xl font-semibold">Creator Name</h2>
              <p className="text-sm text-gray-400 mt-1">@creator_handle</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-3">Select amount</label>
                <div className="grid grid-cols-4 gap-2">
                  {['0.001', '0.005', '0.01', '0.05'].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-all ${
                        tipAmount === amount
                          ? 'bg-[#0052FF] text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#0052FF]"
                  />
                  <span className="text-gray-400">ETH</span>
                </div>
              </div>

              {account && balance && (
                <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-xl">
                  <span className="text-sm text-gray-400">Your balance</span>
                  <span className="font-medium">{balance} ETH</span>
                </div>
              )}

              {status && (
                <div className={`p-4 rounded-xl text-sm ${
                  status.includes('success') || status.includes('Connected')
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : status.includes('Error') || status.includes('rejected')
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {status}
                </div>
              )}

              <button
                onClick={sendTip}
                disabled={isLoading || !hasWallet}
                className="w-full py-4 bg-[#0052FF] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
              >
                {isLoading ? 'Processing...' : account ? `Send ${tipAmount} ETH` : 'Connect Wallet'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
