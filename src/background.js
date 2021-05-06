import { eventsHandler } from './background/eventsHandler.js';
import { controller } from './background/controller.js';

browser.notifications.onClicked.addListener((id) => {
  browser.tabs.create({ url: id });
});

eventsHandler(Object.freeze(controller()));
