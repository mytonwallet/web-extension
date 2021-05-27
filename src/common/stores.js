import { writable} from 'svelte/store';

export { settingsStore, currentPage, currentThemeName, currentLang, currentAutologout, needsBackup  } from './stores/settings.js';
export { networksStore, currentNetwork } from './stores/networks.js';
export { accountStore, currentAccount } from './stores/account.js';

//MISC Stores
export const CURRENT_KS_PASSWORD = writable("G1^8%3*c3Ra9c35");
export const CURRENT_KS_VERSION = writable("1.0");
export const steps = writable({current:0, stepList:[]});
export const lastActionTimestamp = writable();

export function copyItem(item){
  return JSON.parse(JSON.stringify(item));
}
