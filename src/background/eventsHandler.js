import {
  lastActionTimestamp,
  currentAutologout
} from "./../common/stores.js";

export const eventsHandler = (controller) => {
  const fromPage = (sender) => {
    return sender.id == browser.runtime.id && sender.url.indexOf(`${window.location.origin}/page.html`) === 0;
  }; // check that event from page.html

  const fromPopup = (sender) => {
    return sender.id == browser.runtime.id && sender.url.indexOf(`${window.location.origin}/popup.html`) === 0;
  }; // check that event from popup.html

  let autologoutInterval;

  const startAutologoutInterval = () => {
    autologoutInterval = setInterval(async function () {
      const timestamp = await new Promise((resolve) => {
        lastActionTimestamp.subscribe((value) => {
          resolve(value);
        });
      });

      // get setting about autologout period
      const autologout = await new Promise((resolve) => {
        currentAutologout.subscribe((value) => {
          resolve(value);
        });
      });

      if (timestamp + autologout * 60 < ~~(new Date().getTime()/1000)) {
        controller.lock();
      }
    }, 30 * 1000); //check every 30 seconds to cover a case when we have not whole minute
  }

  browser.runtime.onMessage.addListener((message, sender) => {
    if (browser.runtime.lastError) {
      return;
    }

    // mark that the user is working
    lastActionTimestamp.set(~~(new Date().getTime()/1000));

    const isFromPage = fromPage(sender);
    const isFromPopup = fromPopup(sender);

    //Reject any messages not from the App itself of from the autorized Dapp List.
    if (!isFromPopup && !isFromPage) {
      return Promise.resolve("Wrong origin");
    } else {
      if (isFromPage || isFromPopup) {

        if (message.type === 'createPassword') return Promise.resolve(controller.createPassword(message.data));

        if (message.type === 'deployNewWallet') return Promise.resolve(controller.accounts.deployNewWallet(message.data.accountAddress, message.data.server));

        if (message.type === 'walletIsLocked') return Promise.resolve(controller.accounts.walletIsLocked());

        if (message.type === 'lockWallet') {
          clearInterval(autologoutInterval);
          return Promise.resolve(controller.lock());
        }

        if (message.type === 'isFirstRun') return Promise.resolve(controller.accounts.firstRun());

        if (message.type === 'checkPassword') return Promise.resolve(controller.accounts.checkPassword(message.data));

        if (message.type === 'unlockWallet') {
          startAutologoutInterval();
          return Promise.resolve(controller.unlock(message.data));
        }

        const walletIsLocked = controller.accounts.walletIsLocked();
        if (!walletIsLocked.locked) {
          // Account
          if (message.type === 'backupKeystore') return Promise.resolve(controller.accounts.createKeystore(message.data));

          if (message.type === 'decryptKeys') return Promise.resolve(controller.accounts.decryptKeys(message.data));

          if (message.type === 'addNewAccount') return Promise.resolve(controller.accounts.addNewAccount(message.data));

          if (message.type === 'addAccounts') return Promise.resolve(controller.accounts.addAccounts(message.data.full, message.data.encrypted));

          if (message.type === 'addAccountByKeys') return Promise.resolve(controller.accounts.addAccountByKeys(message.data.nickname, message.data.keyPair));

          if (message.type === 'addAccountBySeed') return Promise.resolve(controller.accounts.addAccountBySeed(message.data.nickname, message.data.seed));

          if (message.type === 'getAllAccounts') return Promise.resolve(controller.accounts.getSanatizedAccounts(message.data));

          if (message.type === 'getTransactions') return Promise.resolve(controller.accounts.getTransactions(message.data.accountAddress, message.data.server, message.data.count, message.data.page));

          if (message.type === 'calculateFeeForSafeMultisig') return Promise.resolve(controller.accounts.calculateFeeForSafeMultisig(message.data.accountAddress, message.data.server,  message.data.txData));

          if (message.type === 'sendTransaction') return Promise.resolve(controller.accounts.sendTransaction(message.data.accountAddress, message.data.server,  message.data.txData));

          if (message.type === 'takeFromGiver') return Promise.resolve(controller.accounts.takeFromGiver(message.data.accountAddress, message.data.server));

          if (message.type === 'getCurrentBalance') return Promise.resolve(controller.accounts.getCurrentBalance(message.data.accountAddress, message.data.server));

          if (message.type === 'changeAccountNickname') return Promise.resolve(controller.accounts.changeAccountNickname(message.data.accountAddress, message.data.nickname));

          if (message.type === 'deleteAccount') return Promise.resolve(controller.accounts.deleteAccount(message.data));

          // Network
          if (message.type === 'getAllNetworks') return Promise.resolve(controller.networks.getAllNetworks(message.data));

          if (message.type === 'addNewNetwork') return Promise.resolve(controller.addNewNetwork(message.data));

          if (message.type === 'removeNetwork') return Promise.resolve(controller.removeNetwork(message.data));

          // Settings
          if (message.type === 'setSettings') return Promise.resolve(controller.setSettings(message.data));

          if (message.type === 'setPincode') return Promise.resolve(controller.accounts.setPincode(message.data));
        }
      }
    }
  });
};
