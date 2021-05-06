// Additional info here https://github.com/kaisermann/svelte-i18n/blob/main/docs/Formatting.md
import { register } from 'svelte-i18n';

register('en', function() {
  return window.fetch('/assets/i18n/en.json')
    .then((data) => data.json())
    .catch((error) => console.log('i18n fetch error', error));
});

register('ru', function() {
  return window.fetch('/assets/i18n/ru.json')
    .then((data) => data.json())
    .catch((error) => console.log('i18n fetch error', error));
});
