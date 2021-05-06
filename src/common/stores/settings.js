import { writable, derived, get } from 'svelte/store';
import { setStorageItem, getStorageItem, removeStorageItem } from '../utils.js';
import { init, getLocaleFromNavigator } from 'svelte-i18n';

const defaultSettingsStore = {
  "currentPage" : {
    "name": "AccountMain",
    "data" : {}
  },
  "themeName": "dark",
  "lang": getLocaleFromNavigator(),
  "autologout": 5
};

const createSettingsStore = () => {
  const startValue = defaultSettingsStore;
  //Create Intial Store
  const settingsStore = writable(startValue);
  let initialized = false;

  const getStore = async() => {
    let settings = await getStorageItem("settings");
    if (typeof settings != "undefined") {
      settingsStore.set(settings);
      init({
        fallbackLocale: 'en',
        initialLocale: settings.lang
      });
    } else {
      settingsStore.set(startValue);
      init({
        fallbackLocale: 'en',
        initialLocale: startValue.lang
      });
    }
    initialized = true;
  };

  //This is called everytime when settingsStore is updated
  settingsStore.subscribe(async (current) => {
    if (!initialized) {
      return current;
    }
    await setStorageItem("settings", current);
  });

  getStore();

  let subscribe = settingsStore.subscribe;
  let update = settingsStore.update;
  let set = settingsStore.set;

  return {
    subscribe,
    set,
    update,
    initialized: () => initialized,
    changePage: (pageInfoObj) => {
      if (!pageInfoObj.data) {
        pageInfoObj.data = {};
      }
      settingsStore.update((store) => {
        store.currentPage = pageInfoObj;
        return store;
      });
    },
    setLang: (lang) => {
      settingsStore.update((store) => {
        store.lang = lang;
        return store;
      });
    },
    setAutologout: (period) => {
      settingsStore.update((store) => {
        store.autologout = period;
        return store;
      });
    },
    setThemeName: (themeName) => {
      settingsStore.update((store) => {
        store.themeName = themeName;
        return store;
      });
    },
    setLastBackupDate: () => {
      settingsStore.update((store) => {
        store.lastBackupDate = new Date().getTime();
        store.dismissWarning = false;
        return store;
      });
    },
    setLastChangeDate: () => {
      settingsStore.update((store) => {
        store.lastChangeDate = new Date().getTime();
        store.dismissWarning = false;
        return store;
      });
    },
    dismissWarning: () => {
      settingsStore.update((store) => {
        store.dismissWarning = true;
        return store;
      });
    }
  };
};

//Settings Stores
export const settingsStore = createSettingsStore();

//Derived Store to return the current page object
export const currentPage = derived(
  settingsStore,
  ($settingsStore) => { return $settingsStore.currentPage; }
);

//Derived Store to return the current lang
export const currentLang = derived(
  settingsStore,
  ($settingsStore) => { return $settingsStore.lang; }
);

//Derived Store to return the current autologout setting
export const currentAutologout = derived(
  settingsStore,
  ($settingsStore) => { return $settingsStore.autologout; }
);

//Derived Store to return the current theme
export const currentThemeName = derived(
  settingsStore,
  ($settingsStore) => { return $settingsStore.themeName; }
);

//Derived Store to return if the user needs to make another backup
export const needsBackup = derived(
  settingsStore,
  ($settingsStore) => {
    if ($settingsStore.dismissWarning) return false;
    if ($settingsStore.lastBackupDate && $settingsStore.setLastChangeDate){
      return new Date($settingsStore.setLastChangeDate) > new Date($settingsStore.lastBackupDate);
    }
    if (typeof $settingsStore.lastBackupDate === 'undefined' && $settingsStore.setLastChangeDate) {
      return true;
    }
    return false;
  }
);
