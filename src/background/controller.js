import { accounts } from './accounts.js';
import { networks } from './networks.js';
import { broadcastMessage } from '../common/utils.js';
import { settingsStore } from "../common/stores.js";

export const controller = () => {
  const accountsController = Object.freeze(accounts());
  const networksController = Object.freeze(networks());

  const createPassword = (string) => {
    let created = accountsController.createPassword(string);
    if (created) broadcastMessage('walletIsLocked', created);
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

  const unlock = async (password) => {
    const unlocked = await accountsController.unlock(password);
    broadcastMessage('walletIsLocked', !unlocked);
    return unlocked;
  };

  const lock = () => {
    accountsController.lock();
    broadcastMessage('walletIsLocked', true);
    return true;
  };

  const setSettings = async (settings) => {
    await setStorageItem("settings", settings);
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
