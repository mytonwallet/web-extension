<script>
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { _ } from "svelte-i18n";

  //Components
  import Logo from "../../Elements/Popup/Logo.svelte";
  import { Field, Input, Button } from "svelte-chota";
  import { openPageWithPath } from "../../../common/utils.js";

  //DOM nodes
  let formObj, pwdObj;

  export let loaded;

  const handleSubmit = (event) => {
    if (formObj.checkValidity()) {
      browser.runtime
        .sendMessage({ type: "unlockWallet", data: pwdObj.value })
        .then((unlocked) => {
          if (!unlocked || browser.runtime.lastError) {
            setValidity(pwdObj, $_("Incorrect password"));
          }
        });
    }
    event.preventDefault();
  };

  onMount(() => {
    pwdObj = document.getElementById("pwd-input");
  });

  const setValidity = (node, message) => {
    node.setCustomValidity(message);
    node.reportValidity();
  };

  const refreshValidityKeyup = (e) => {
    if (e.detail.keyCode !== 13) setValidity(pwdObj, "");
  };

  const openPage = () => {
    openPageWithPath("restore");
  };
</script>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    margin-left: auto;
    margin-right: auto;
  }

  .layout-width {
    width: 100%;
  }

  .content {
    flex-grow: 1;
  }

  .header {
    display: flex;
    flex-direction: row;
    position: absolute;
    left: 0%;
    right: 0%;
    top: 0%;
    bottom: 0%;
    right: 0;
    height: 5rem;
    border-bottom: 1px solid var(--divider-light);
  }

  .heading {
    margin-bottom: 5rem;
  }

  .lockscreen {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 16px 24px 0 24px;
  }

  form {
    display: flex;
    flex-direction: column;
    margin-bottom: 5rem;
  }

  .footer {
    text-align: center;
  }
</style>

<div class="layout" class:layout-padding={loaded} class:layout-width={!loaded}>
  <div class="header">
    <Logo />
  </div>
  <div class="content">
    <div
      class="lockscreen"
      in:fly={{ delay: 100, duration: 300, x: 0, y: -400, opacity: 0, easing: quintOut }}>
      <h6 class="heading">{$_('Unlock')}</h6>
      <div class="flow-text-box text-body1">{$_('Access your wallet')}</div>

      <form bind:this={formObj}>
        <Field label={$_('Password')}>
          <Input
            id="pwd-input"
            on:input={() => setValidity(pwdObj, '')}
            on:keyup={refreshValidityKeyup}
            password
            autofocus={true}
            required={true} />
        </Field>
        <Button
          id="login-btn"
          on:click={(event) => handleSubmit(event)}
          class="button__solid button__primary submit submit-button submit-button-text">
          {$_('Unlock')}
        </Button>
      </form>
      <a
        class="flow-text-box footer text-body1"
        href="{'#'}"
        on:click={() => {
          openPage();
        }}>
        {$_('Open page')}
      </a>
    </div>
  </div>
</div>
