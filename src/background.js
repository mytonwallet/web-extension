import { eventsHandler } from './background/eventsHandler.js';
import { controller } from './background/controller.js';

const devMode = __DEV_MODE__;

if (devMode) {
  browser.browserAction.setBadgeText({'text': 'Dev'}); // to mark that it is not from the webstore
}

browser.notifications.onClicked.addListener((id) => {
  browser.tabs.create({ url: id });
});

eventsHandler(Object.freeze(controller()));
