import { writable, derived, get } from 'svelte/store';
import { setStorageItem, getStorageItem, removeStorageItem } from '../utils.js';

const defaultAccountStore = {
  "currentAccount" : {}
};

const createAccountStore = () => {
  const startValue = defaultAccountStore;
  //Create Intial Store
  const accountStore = writable(startValue);
  let initialized = false;

  const getStore = async() => {
    let account = await getStorageItem("account");
    if (typeof account != "undefined") {
      accountStore.set(account);
    } else {
      accountStore.set(startValue);
    }
    initialized = true;
  };

  //This is called everytime when accountStore is updated
  accountStore.subscribe(async (current) => {
    if (!initialized) {
      return current;
    }
    await setStorageItem("account", current);
  });

  getStore();

  let subscribe = accountStore.subscribe;
  let update = accountStore.update;
  let set = accountStore.set;

  return {
    subscribe,
    set,
    update,
    initialized: () => initialized,
    changeAccount: (accountInfoObj) => {
      accountStore.update((store) => {
        //Set account in Account store
        store.currentAccount = accountInfoObj;
        return store;
      });
    }
  };
};

//Account Stores
export const accountStore = createAccountStore();

//Derived Store to return the current account object
export const currentAccount = derived(
  accountStore,
  ($accountStore) => { return $accountStore.currentAccount; }
);
