import { Vault } from "../common/vault.js";
import { generateRandomHex, encrypt, decrypt, strToHex, broadcastMessage } from "../common/utils.js";
import TonLib from "../common/tonLib.js";
import SafeMultisigWallet from "./solidity/SafeMultisigWallet/SafeMultisigWallet.json";
import Transfer from "./solidity/Transfer/Transfer.json";
import GiverV2 from "./solidity/GiverV2/GiverV2.json";
import giverkeyPair from "./solidity/GiverV2/GiverV2.keys.json";
import { CURRENT_KS_PASSWORD, SAFE_MULTISIG_WALLET_CODE_HASH, currentRetrievingTransactionsPeriod, currentRetrievingTransactionsLastTime, settingsStore } from "../common/stores.js";

export const accounts = () => {
  let currentPassword = "";
  const vault = new Vault();
  vault.init();

  let retrievingTransactionsIntervalPeriod = 0.1;
  let retrievingTransactionsLastTime;
  currentRetrievingTransactionsPeriod.subscribe((value) => {
    retrievingTransactionsIntervalPeriod = value;
  });

  currentRetrievingTransactionsLastTime.subscribe((value) => {
    retrievingTransactionsLastTime = value;
  });

  const retrievingTransactionsInterval = setInterval(async function () {
    const networks = await vault.getNetworks();
    const accounts = await vault.getAccounts();
    const allAddresses = accounts.map((item) => {return item.address});
    let needToUpdateWalletUI = false;
    for (let i in networks) {
      const network          = networks[i];
      const server           = networks[i].server;

      const TonLibClient     = await TonLib.getClient(server);
      const transactions     = await TonLib.requestAccountsTransactions(allAddresses, retrievingTransactionsLastTime);
      if (transactions.length === 0) {
        continue;
      }
      const transactionsAddresses = transactions.map((item) => {return item.account_addr}).filter((v, i, a) => a.indexOf(v) === i);
      for (let j in transactionsAddresses) {
        const lastTransactions = await vault.getTransactions(transactionsAddresses[j], server, 15, 1);
        const txIds = lastTransactions.map((tx) => {
          return tx.id;
        });
        for (let i in transactions) {
          if (transactions[i].account_addr != transactionsAddresses[j] || (transactions[i].account_addr == transactionsAddresses[j] && txIds.includes(transactions[i].id) === true)) {
            continue;
          }
          const txData = transactions[i];
          if (txData.orig_status === 0 && txData.end_status === 1) {
            txData.type = "deploy";
          } else if (txData.aborted === true && txData.orig_status != 0) {
            txData.type = "error";
          } else {
            txData.type = (txData.balance_delta < 0 ? "transfer": "incoming");
          }
          txData.contractName = "SafeMultisigWallet";
          txData.coinName     = network.coinName;
          txData.amount       = txData.balance_delta;
          await addTransaction(transactionsAddresses[j], server, txData);
          needToUpdateWalletUI = true;
        }
      }
    }
    if (needToUpdateWalletUI) {
      broadcastMessage("updateWalletUI");
    }
    settingsStore.setRetrievingTransactionsLastTime(~~(new Date().getTime()/1000));
  }, retrievingTransactionsIntervalPeriod * 60 * 1000); //check every x minutes

  const updateTransactionsList = async (address, server, fromStart = false) => {
    const TonLibClient     = await TonLib.getClient(server);
    const transactions     = await TonLib.requestAccountsTransactions([address], fromStart ? 0: retrievingTransactionsLastTime);
    if (transactions.length === 0) {
      return;
    }
    const network = await vault.getNetwork(server);
    const lastTransactions = await vault.getTransactions(address, server, 15, 1);
    const txIds = lastTransactions.map((tx) => {
      return tx.id;
    });
    let needToUpdateWalletUI = false;
    for (let i in transactions) {
      if (transactions[i].account_addr == address && txIds.includes(transactions[i].id) === true) {
        continue;
      }
      const txData = transactions[i];
      if (txData.orig_status === 0 && txData.end_status === 1) {
        txData.type = "deploy";
      } else if (txData.aborted === true && txData.orig_status == 1) {
        txData.type = "error";
      } else {
        txData.type = (txData.balance_delta < 0 ? "transfer": "incoming");
      }
      txData.contractName = "SafeMultisigWallet";
      txData.coinName     = network.coinName;
      txData.amount       = txData.balance_delta;
      await addTransaction(address, server, txData);
      needToUpdateWalletUI = true;
    }
    if (needToUpdateWalletUI) {
      broadcastMessage("updateWalletUI");
    }
  };

  const updateTransactionsListAllNetworks = async (address) => {
    const networks = await vault.getNetworks();
    for (let i in networks) {
      await updateTransactionsList(address, networks[i].server, true);
    }
  };

  const firstRun = async () => {
    return await vault.getAccountCount() == 0;
  };

  const createPassword = async (password) => {
    currentPassword = password;
    const key = generateRandomHex(256);
    const encrypted = await encrypt(currentPassword, {"key": key});
    await vault.addMasterKey(1, key, encrypted);
    return true;
  };

  const checkPassword = (password) => {
    return password === currentPassword;
  };

  const addNewAccount = async (nickname) => {
    const TonLibClient = await TonLib.getClient();
    const seed         = await TonLibClient.generateSeed();
    const keyPair      = await TonLibClient.convertSeedToKeys(seed.phrase);
    const address      = await TonLibClient.predictAddress(keyPair.public, SafeMultisigWallet.abi, SafeMultisigWallet.tvc);
    const account = {
      address: address,
      nickname: nickname,
      balance: {},
      transactions: {},
      updatedDate: ~~(new Date().getTime()/1000), //rounded to seconds
      createdDate: ~~(new Date().getTime()/1000), //rounded to seconds
      contactList: {},
      contractList: {},
      tokenList: {},
      deployed: [],
      encrypted: await encrypt(currentPassword, keyPair) // must be encrypted
    };
    try {
      if (await vault.addNewAccount(account)) {
        return { added: true,
          seed: seed.phrase,
          account: {
            address: address,
            nickname: nickname,
            deployed: [],
            balance: {},
          },
          reason: `Added ${account.nickname} to your wallet`
        };
      } else {
        throw Error("Account by this address already exists");
      }
    } catch (e) {
      return {added: false, reason: e.message};
    }
  };

  const takeFromGiver = async (destination, server) => {
    const network = await vault.getNetwork(server);
    if (network.giver == "") {
      return Error("giver is not existed for this network");
    }
    const TonLibClient = await TonLib.getClient(server);
    try {
      const result = await TonLibClient.sendTransaction(network.giver, "sendTransaction", GiverV2.abi, {
        dest: destination,
        value: 5000000000,
        bounce: false
      }, giverkeyPair);
      if (result) {
        updateTransactionsList(destination, server); // here we don't need to sync this process
        return {added: true, id: result.id, reason: `5000000000 crystals have been added to the address ${destination}`};
      } else {
        throw Error("Account by this address already exists");
      }
    } catch (e) {
      return {added: false, reason: e.message};
    }
  };

  const updateAllBalances = async (server) => {
    const TonLibClient = await TonLib.getClient(server);
    const accounts = await vault.getAccounts();
    let balances = [];
    try {
      balances = await TonLibClient.requestManyAccountBalances(accounts.map((item) => {return item.address;}));
    } catch(e) {
      throw e;
    }
    for (let i in balances) {
      await vault.updateBalance(balances[i]["id"], server, balances[i]["balance"]);
    }
    return true;
  };

  const getCurrentBalance = async (destination, server) => {
    const TonLibClient = await TonLib.getClient(server);
    let amount = 0;
    try {
      amount = await TonLibClient.requestAccountBalance(destination);
    } catch(e) {
      throw e;
    }
    await vault.updateBalance(destination, server, amount);
    return amount;
  };

  const deployNewWallet = async (destination, server) => {
    try {
      const account = await vault.getAccount(destination);
      const TonLibClient = await TonLib.getClient(server);
      const keyPair = await decrypt(currentPassword, account.encrypted);
      // store it in tx as initial tx state
      const result = await TonLibClient.sendDeployTransaction(destination, SafeMultisigWallet.abi, SafeMultisigWallet.tvc, {
        initFunctionName: "constructor",
        initFunctionInput: {
          owners: [`0x${keyPair.public}`], // Multisig owner public key.
          reqConfirms: 0
        }
      }, keyPair);

      const network = await vault.getNetwork(server);
      // mark that SafeMultisigWallet has been deployed in vault db
      await vault.markAsDeployed(destination, server);
      result.type          = "deploy";
      result.contractName  = "SafeMultisigWallet"; // we will be able to find ABI
      result.coinName      = network.coinName;
      result.amount        = Number(result.balance_delta.substr(1))*-1;
      result.parameters = {
        initFunctionName: "constructor",
        initFunctionInput: {
          owners: [`0x${keyPair.public}`], // Multisig owner public key.
          reqConfirms: 0
        }
      };
      await addTransaction(destination, server, result);
      return {success: true, id: result.id, reason: `SafeMultisig smart contract has been deployed for address ${destination}`};
    } catch (exp) {
      const response = {success: false, reason: exp.message};
      if (exp.message.indexOf("Constructor was already called") != -1) {
        // mark that SafeMultisigWallet has been deployed in vault db
        const deployed = await checkSafeMultisigDeployed(destination);
        if (deployed.includes(server) === true) {
          await vault.markAsDeployed(destination, server);
          response.alreadyDeployed = true;
        }
      }
      return response;
    }
  };

  // don't need to export this function
  const addTransaction = async (destination, server, txData) => {
    await vault.addTransaction(destination, server, txData);
    const network = await vault.getNetwork(server);
    await browser.notifications.create(`${network.explorer}/transactions/transactionDetails?id=${txData.id}`, {
      "type": "basic",
      "iconUrl": `${window.location.origin}/assets/img/icon-32.png`,
      "requireInteraction": true,
      "title": browser.i18n.getMessage("extName"),
      "message": browser.i18n.getMessage("TransactionIsConfirmed")
    });
  };

  const getTransactions = async (destination, server, count, page) => {
    return await vault.getTransactions(destination, server, count, page);
  };

  const unlock = async (password) => {
    const checkKey = await vault.getMasterKey(1);
    try {
      const encrypted = await decrypt(password, checkKey.encrypted);
      if (checkKey.key == encrypted.key) {
        currentPassword = password;
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const lock = () => {
    currentPassword = "";
  };

  const walletIsLocked = () => {
    return currentPassword == "";
  };

  const createKeystore = async (info) => {
    const decryptedAccounts = await decryptedVault(info.full);
    const data = {'version' : info.version, 'full': info.full, 'encrypted': decryptedAccounts};
    const encrypted = await encrypt(info.password, data);
    const keystore = { data: encrypted };
    if (info.hint == "") {
      keystore.hint = "";
    } else {
      const ks_password = await new Promise((resolve) => {
        CURRENT_KS_PASSWORD.subscribe((value) => {
          resolve(value);
        });
      });
      keystore.hint = await encrypt(ks_password, info.hint);
    }
    return JSON.stringify(keystore);
  };

  const decryptKeys = async () => {
    const decrypted = await decryptedVault(false);
    return decrypted;
  };

  const decryptedVault = async (full) => {
    const accounts = await vault.getAccounts();
    const decryptedAccounts = Promise.all(
      accounts.map(async (account) => {
        account.keyPair = await decrypt(currentPassword, account.encrypted);
        delete account.encrypted;
        return full ? account : { address: account.address, nickname: account.nickname, keyPair: account.keyPair};
      })
    );
    return await decryptedAccounts;
  };

  const changeAccountNickname = async (address, nickname) => {
    return await vault.updateNickname(address, nickname);
  };

  const addAccount = async (account) => {
    return await vault.addNewAccount(account);
  };

  const checkSafeMultisigDeployed = async (account) => {
    let deployed = [];
    const networks = await vault.getNetworks();
    for (let i in networks) {
      const network = networks[i];
      const TonLibClient = await TonLib.getClient(network.server);
      const accountData = await TonLibClient.requestAccountData(account);
      if (accountData && accountData.code_hash === SAFE_MULTISIG_WALLET_CODE_HASH) {
        deployed.push(network.server);
      }
    }
    return deployed;
  };

  const addAccounts = async (full, accounts) => {
    const resultAccounts = Promise.all(
      accounts.map(async (account) => {
        let result;
        if (full) {
          account.encrypted = await encrypt(currentPassword, account.keyPair);
          account.deployed  = await checkSafeMultisigDeployed(account.address);
          result = await vault.addNewAccount(account);
        } else {
          const fullAccount = {
            address: account.address,
            nickname: account.nickname,
            balance: {},
            transactions: {},
            updatedDate: ~~(new Date().getTime()/1000), //rounded to seconds
            createdDate: ~~(new Date().getTime()/1000), //rounded to seconds
            contactList: {},
            contractList: {},
            tokenList: {},
            deployed: await checkSafeMultisigDeployed(account.address),
            encrypted: await encrypt(currentPassword, account.keyPair) // must be encrypted
          };
          result = await vault.addNewAccount(fullAccount);
        }
        updateTransactionsListAllNetworks(account.address);
        return {"address": account.address, "nickname": account.nickname, "deployed": [], "balance": {},  "result": result};
      })
    );
    return await resultAccounts;
  };

  const addAccountByKeys = async (nickname, keyPair) => {
    const TonLibClient = await TonLib.getClient();
    const address = await TonLibClient.predictAddress(keyPair.public, SafeMultisigWallet.abi, SafeMultisigWallet.tvc);
    const account = {
      address: address,
      nickname: nickname,
      balance: {},
      transactions: {},
      updatedDate: ~~(new Date().getTime()/1000), //rounded to seconds
      createdDate: ~~(new Date().getTime()/1000), //rounded to seconds
      contactList: {},
      contractList: {},
      tokenList: {},
      deployed: await checkSafeMultisigDeployed(address),
      encrypted: await encrypt(currentPassword, keyPair) // must be encrypted
    };

    try {
      if (await vault.addNewAccount(account)) {
        updateTransactionsListAllNetworks(account.address);
        return {"address": account.address, "nickname": account.nickname, "deployed": [], "balance": {}, "result": true};
      } else {
        return {"address": account.address, "nickname": account.nickname, "deployed": [], "balance": {}, "result": false};
      }
    } catch (e) {
      return {"added": false, "error": e.message};
    }
  };

  const addAccountBySeed  = async (nickname, seed) => {
    const TonLibClient = await TonLib.getClient();
    const keyPair = await TonLibClient.convertSeedToKeys(seed);
    const address = await TonLibClient.predictAddress(keyPair.public, SafeMultisigWallet.abi, SafeMultisigWallet.tvc);
    const account = {
      address: address,
      nickname: nickname,
      balance: {},
      transactions: {},
      updatedDate: ~~(new Date().getTime()/1000), //rounded to seconds
      createdDate: ~~(new Date().getTime()/1000), //rounded to seconds
      contactList: {},
      contractList: {},
      tokenList: {},
      deployed: await checkSafeMultisigDeployed(address),
      encrypted: await encrypt(currentPassword, keyPair) // must be encrypted
    };

    try {
      if (await vault.addNewAccount(account)) {
        updateTransactionsListAllNetworks(account.address);
        return {"address": account.address, "nickname": account.nickname, "deployed": [], "balance": {}, "result": true};
      } else {
        return {"address": account.address, "nickname": account.nickname, "deployed": [], "balance": {}, "result": false};
      }
    } catch (e) {
      return {"added": false, "error": e.message};
    }
  };

  const deleteAccount = async (accountAddress) => {
    return await vault.removeAccount(accountAddress);
  };

  const getSanatizedAccounts = async (fields = []) => {
    const accounts = await vault.getAccounts();
    return accounts.map((account) => {
      let newAccount = {};
      delete account.encrypted;
      if (fields.length) {
        for (const field in account) {
          if (fields.includes(field)) {
            newAccount[field] = account[field];
          }
        }
      } else {
        newAccount = account;
      }
      return newAccount;
    });
  };

  const calculateFeeForSafeMultisig = async (accountAddress, server, txData) => {
    try {
      const account      = await vault.getAccount(accountAddress);
      const TonLibClient = await TonLib.getClient(server);
      const keyPair      = await decrypt(currentPassword, account.encrypted);
      const payload      = await TonLibClient.encodeMessageBody(Transfer.abi,
        "transfer",
        { comment: strToHex(txData.params.message) }
      );

      let bounce = false;
      const accountData = await TonLibClient.requestAccountData(txData.params.destination);
      if (accountData) {
        bounce = true;
      }

      // Prepare input parameter for 'submitTransaction' method of multisig wallet
      const submitTransactionParams = {
        dest: txData.params.destination,
        value: txData.params.allBalance ? 1000000 : txData.params.amount, //1000000 - 1e6 min value
        bounce: bounce,
        allBalance: txData.params.allBalance,
        payload: payload
      };

      const network = await vault.getNetwork(server);
      let result;
      if (txData.params.allBalance) { //@TODO need to be sure, that one-custodial wallet
        result = await TonLibClient.calcRunFees(accountAddress,
          "sendTransaction",
          SafeMultisigWallet.abi,
          { dest: txData.params.destination,
            value: 0,
            bounce: bounce,
            flags: 130,
            payload: payload
          },
          keyPair);
      } else {
        result = await TonLibClient.calcRunFees(accountAddress,
          "submitTransaction",
          SafeMultisigWallet.abi,
          submitTransactionParams,
          keyPair);
      }
      return {fee: result};
    } catch (exp) {
      return {error: exp.message};
    }
  };

  const sendTransaction = async (accountAddress, server, txData) => {
    try {
      const account      = await vault.getAccount(accountAddress);
      const TonLibClient = await TonLib.getClient(server);
      const keyPair      = await decrypt(currentPassword, account.encrypted);
      const payload      = await TonLibClient.encodeMessageBody(Transfer.abi,
        "transfer",
        { comment: strToHex(txData.params.message) }
      );

      let bounce = false;
      const accountData = await TonLibClient.requestAccountData(txData.params.destination);
      if (accountData) {
        bounce = true;
      }

      // Prepare input parameter for 'submitTransaction' method of multisig wallet
      const submitTransactionParams = {
        dest: txData.params.destination,
        value: txData.params.allBalance ? 1000000 : txData.params.amount, //1000000 - 1e6 min value
        bounce: bounce,
        allBalance: txData.params.allBalance,
        payload: payload
      };

      const network = await vault.getNetwork(server);
      let result;
      if (txData.params.allBalance) { //@TODO need to be sure, that one-custodial wallet
        result = await TonLibClient.sendTransaction(accountAddress,
          "sendTransaction",
          SafeMultisigWallet.abi,
          { dest: txData.params.destination,
            value: 0,
            bounce: bounce,
            flags: 130,
            payload: payload
          },
          keyPair);
      } else {
        result = await TonLibClient.sendTransaction(accountAddress,
          "submitTransaction",
          SafeMultisigWallet.abi,
          submitTransactionParams,
          keyPair);
      }

      result.type          = "transfer";
      result.contractName  = "SafeMultisigWallet"; // we will be able to find ABI
      result.coinName      = network.coinName;
      result.amount        = Number(result.balance_delta.substr(1))*-1;
      result.allBalance    = txData.params.allBalance;
      result.parameters = {
        initFunctionName: "submitTransaction",
        initFunctionInput: submitTransactionParams
      };
      await addTransaction(accountAddress, server, result);
      await updateAllBalances(server);

      // if internal tx, then need to update immediately
      const accounts          = await vault.getAccounts();
      const accountsAddresses = accounts.map((account) => {
        return account.address;
      });

      if (accountsAddresses.includes(txData.params.destination) === true) {
        updateTransactionsList(txData.params.destination, server);
      }

      return {id: result.id, reason: `SubmitTransaction for ${txData.params.destination} with amount ${txData.params.amount}`};
    } catch (exp) {
      return {error: exp.message};
    }
  };

  return {
    createPassword,
    checkPassword,
    firstRun,
    takeFromGiver,
    getCurrentBalance,
    deployNewWallet,
    createKeystore,
    addNewAccount,
    addAccounts,
    addAccountBySeed,
    addAccountByKeys,
    getSanatizedAccounts,
    changeAccountNickname,
    deleteAccount,
    unlock,
    lock,
    walletIsLocked,
    decryptKeys,
    addTransaction,
    getTransactions,
    calculateFeeForSafeMultisig,
    sendTransaction
  };
};
