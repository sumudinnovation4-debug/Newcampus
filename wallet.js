/**
 * WALLET ENGINE
 * -----------------------------------------------------------------------
 * Acts as the "bank" for every user's in-app balance, plus one special
 * account: the PLATFORM wallet, which collects the 5% commission.
 *
 * This is a localStorage-backed simulation standing in for a real
 * database + Paystack Transfers backend. Swap `Wallet._payout()` for a
 * real server call later and nothing else in the app needs to change.
 */
const Wallet = (() => {
  const LS_KEY = "nc_wallets";
  const TX_KEY = "nc_transactions";

  function _readWallets() {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  }
  function _writeWallets(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }
  function _readTx() {
    return JSON.parse(localStorage.getItem(TX_KEY) || "[]");
  }
  function _logTx(entry) {
    const tx = _readTx();
    tx.unshift({ id: "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), timestamp: new Date().toISOString(), ...entry });
    localStorage.setItem(TX_KEY, JSON.stringify(tx));
    return tx[0];
  }

  function ensureAccount(userId) {
    const wallets = _readWallets();
    if (!(userId in wallets)) {
      wallets[userId] = 0;
      _writeWallets(wallets);
    }
    return wallets[userId];
  }

  function getBalance(userId) {
    ensureAccount(userId);
    return _readWallets()[userId];
  }

  function credit(userId, amount, meta = {}) {
    if (amount <= 0) throw new Error("Credit amount must be positive");
    const wallets = _readWallets();
    wallets[userId] = (wallets[userId] || 0) + amount;
    _writeWallets(wallets);
    return _logTx({ userId, type: "credit", amount, balanceAfter: wallets[userId], ...meta });
  }

  function debit(userId, amount, meta = {}) {
    if (amount <= 0) throw new Error("Debit amount must be positive");
    const wallets = _readWallets();
    const bal = wallets[userId] || 0;
    if (bal < amount) throw new Error(`Insufficient balance for ${userId}`);
    wallets[userId] = bal - amount;
    _writeWallets(wallets);
    return _logTx({ userId, type: "debit", amount, balanceAfter: wallets[userId], ...meta });
  }

  /** Move money between two internal wallets, atomically-ish, with a logged reason. */
  function transfer(fromUserId, toUserId, amount, meta = {}) {
    debit(fromUserId, amount, { ...meta, direction: "out", counterparty: toUserId });
    credit(toUserId, amount, { ...meta, direction: "in", counterparty: fromUserId });
  }

  /** Split a gross amount into (netToRecipient, platformCommission). */
  function splitCommission(grossAmount) {
    const rate = window.NC_CONFIG.PLATFORM_COMMISSION;
    const commission = Math.round(grossAmount * rate * 100) / 100;
    const net = Math.round((grossAmount - commission) * 100) / 100;
    return { net, commission, rate };
  }

  /**
   * Real bank payout via your /api/payout serverless function.
   * Requires the user to already have a recipientCode on file
   * (from /api/create-recipient - see Wallet.setRecipientCode).
   * If they don't have one yet, this falls back to crediting the
   * internal wallet so nothing breaks - it'll show up as an
   * available balance they can withdraw once they add bank details.
   */
  async function _payout(userId, amount, meta = {}) {
    const recipientCode = getRecipientCode(userId);
    if (!recipientCode) {
      return credit(userId, amount, { ...meta, note: "No payout bank account on file yet - held as wallet balance" });
    }
    try {
      const response = await fetch("/api/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientCode, amount, reason: meta.type || "Newcampus payout" }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Payout failed");
      return _logTx({ userId, type: "real_payout", amount, transferCode: data.transferCode, status: data.status, ...meta });
    } catch (err) {
      // Fall back to internal wallet credit so the money isn't lost/stuck if the transfer call fails
      return credit(userId, amount, { ...meta, note: `Real payout failed (${err.message}) - held as wallet balance instead` });
    }
  }

  /** Store/read a user's Paystack recipient_code (from /api/create-recipient) so future payouts can use it. */
  function setRecipientCode(userId, recipientCode) {
    const map = JSON.parse(localStorage.getItem("nc_recipient_codes") || "{}");
    map[userId] = recipientCode;
    localStorage.setItem("nc_recipient_codes", JSON.stringify(map));
  }
  function getRecipientCode(userId) {
    const map = JSON.parse(localStorage.getItem("nc_recipient_codes") || "{}");
    return map[userId] || null;
  }

  function history(userId) {
    return _readTx().filter((t) => t.userId === userId);
  }

  function allTransactions() {
    return _readTx();
  }

  return { getBalance, credit, debit, transfer, splitCommission, _payout, history, allTransactions, ensureAccount, setRecipientCode, getRecipientCode };
})();

window.Wallet = Wallet;
