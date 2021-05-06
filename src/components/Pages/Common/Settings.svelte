<script>
  import { onMount, getContext } from "svelte";
  import { fade } from "svelte/transition";
  import { _, locale, locales } from 'svelte-i18n';

  //Stores
  import { settingsStore, currentLang, currentAutologout } from "../../../common/stores.js";
  import { Checkbox, Field, Input, Button } from "svelte-chota";

  //Components
  import ErrorBox from "../../Elements/ErrorBox.svelte";

  //Context
  const { switchPage } = getContext("app_functions");

  //DOM nodes
  let error, formObj, language, autologout;

  //Props
  onMount(() => {
    language   = document.getElementById("language-input");
    autologout = document.getElementById("autologout-input");
  });

  const handleSubmit = async () => {
    try {
      if (formObj.checkValidity()) {
        settingsStore.setLang(language.value);
        settingsStore.setAutologout(autologout.value);

        // need to change storage on background
        browser.runtime.sendMessage({type: "setAutologout", data: autologout.value});

        switchPage("AccountMain");
      }
    } catch(e) {
      formObj.reportValidity();
    }
  };

  const goBack = () => {
    switchPage("AccountMain");
  };
</script>

<style>
</style>

<h6>{$_("Settings")}</h6>

<form
  id="settings-form"
  on:submit|preventDefault={() => handleSubmit()}
  target="_self"
  bind:this={formObj}>
  <Field grouped>
    <div class="input-box-50">
      <Field label="{$_("Language")}">
        <select id="language-input" bind:value={$locale}>
          {#each $locales as locale}
            <option selected={locale == $currentLang} value={locale}>{$_(locale)}</option>
          {/each}
        </select>
      </Field>
    </div>
    <div class="input-box-50">
      <Field label="{$_("Autologout (in minutes)")}">
        <Input id="autologout-input" type="number" value="{$currentAutologout}"/>
      </Field>
    </div>
  </Field>
  <div class="flex-column flow-buttons">
    <Button
      form="settings-form"
      class="button__solid button__primary submit-button submit-button-text submit"
      style="margin: 0 0 1rem;"
      type="submit">
      {$_("Save settings")}
    </Button>
    <Button
      id="back"
      class="flex-row flex-center-centr button__solid button"
      style="margin: 0 0 1rem;"
      on:click={() =>goBack()}>
      {$_("Back")}
    </Button>
  </div>
</form>
