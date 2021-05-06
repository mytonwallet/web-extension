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

  const setAutologout = (period) => {
    settingsStore.setAutologout(period);
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
    setAutologout,
    unlock,
    lock
  };
};
