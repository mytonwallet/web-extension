import { accounts } from './accounts.js';
import { networks } from './networks.js';
import { broadcastMessage } from '../common/utils.js';
import { settingsStore, currentEnabledPinPad } from "../common/stores.js";

export const controller = () => {
  const accountsController = Object.freeze(accounts());
  const networksController = Object.freeze(networks());

  const createPassword = async (string) => {
    let created = accountsController.createPassword(string);
    if (created) {
      // get setting about enabled/disabled pin pad
      const enabledPinPad = await new Promise((resolve) => {
        currentEnabledPinPad.subscribe((value) => {
          resolve(value);
        });
      });
      broadcastMessage('walletIsLocked', {"locked": created, "enabledPinPad": enabledPinPad});
    }
    return created;
  };

  const addNewNetwork = async (network) => {
    if (await networksController.addNewNetwork(network)) {
      broadcastMessage('updateNetworks', true);
      return {"success": true};
    }
    return {"success": false, "error": "Network is existed"};
  };

  const removeNetwork = async (server) => {
    await networksController.removeNetwork(server);
    broadcastMessage('updateNetworks', true);
    return true;
  };

  const unlock = async (data) => {
    const unlocked = await accountsController.unlock(data);

    // get setting about enabled/disabled pin pad
    const enabledPinPad = await new Promise((resolve) => {
      currentEnabledPinPad.subscribe((value) => {
        resolve(value);
      });
    });
    broadcastMessage('walletIsLocked', {"locked": !unlocked, "enabledPinPad": enabledPinPad});
    return unlocked;
  };

  const lock = async () => {
    accountsController.lock();

    // get setting about enabled/disabled pin pad
    const enabledPinPad = await new Promise((resolve) => {
      currentEnabledPinPad.subscribe((value) => {
        resolve(value);
      });
    });
    broadcastMessage('walletIsLocked', {"locked": true, "enabledPinPad": enabledPinPad});
    return true;
  };

  /*
  * Settings is array with key -> functionName to set value. This function must be existed in settingsStore
  */
  const setSettings = async (settings) => {
    for(let i in settings) {
      if (settingsStore[i]) {
        settingsStore[i](settings[i]);
      }
    }
  };

  const deleteAccount = (data) => {
    const { account, string } = data;
    if (accountsController.checkPassword(string)){
      if (accountsController.deleteOne(account)) {
        return true;
      }
    }
    return false;
  };

  return {
    "accounts": accountsController,
    "networks": networksController,
    createPassword,
    deleteAccount,
    setSettings,
    unlock,
    lock,
    addNewNetwork,
    removeNetwork
  };
};
