<script>
  import { onMount, getContext, afterUpdate } from "svelte";
  import { _ } from "svelte-i18n";
  import Select from "../../Select";

  import {
    shortAddress
  } from "../../../../common/utils.js";

  let allNetworks = [];

  onMount(() => {
    browser.runtime.sendMessage({ type: "getAllNetworks", data: {} }).then((result) => {
      allNetworks = result;
    });
  });

  //Stores
  import {
    accountStore,
    currentAccount,
    currentNetwork,
  } from "../../../../common/stores.js";

  import { fromNano } from "../../../../common/utils.js";

  //Components
  import { Field, Button, Input } from "svelte-chota";

  export let modalData = {};
  let loading = false;
  let disabled = false;

  //Context
  const { closeModal, openModal } = getContext("app_functions");

  const cancelTransaction = () => {
    closeModal();
  };

  const sendTransaction = () => {
    loading  = true;
    disabled = true;
    browser.runtime
      .sendMessage({
        type: "sendTransaction",
        data: modalData
      })
      .then((result) => {
        loading = false;
        closeModal();
        if (result.error) {
          openModal("ModalError", { message: result.error });
        } else {
          browser.runtime
            .sendMessage({
              type: "getCurrentBalance",
              data: {
                accountAddress: $currentAccount.address,
                server: $currentNetwork.server,
              },
            })
            .then((result) => {
              const newCurrentAccount = $currentAccount;
              newCurrentAccount.balance[$currentNetwork.server] = result;
              accountStore.changeAccount(newCurrentAccount);
            })
            .catch((e) => {
              console.log(e); // here don't need to show any error for user, usually it is the network issue in the development environment
            });
        }
      });
  };
</script>

<style>
  .message {

  }
</style>

<div class="sending-tx flex-column">
  <h6>{$_('Send transaction')}</h6>
  <div class="flex-row flex-center-center">
    {$_('Server')}:
    {#each allNetworks as network}
      {#if network.server == modalData.server}
        {network.name}
      {/if}
    {/each}
  </div>
  <div class="flex-row">
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Amount')}</span>
      <span>{fromNano(modalData.txData.params.amount)}</span>
    </div>
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Fee')}</span>
      <span>~ {modalData.fee}</span>
    </div>
  </div>
  <div class="flex-row">
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Address')}</span>
      <span>{shortAddress(modalData.accountAddress)}</span>
    </div>
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Destination')}</span>
      <span>{shortAddress(modalData.txData.params.destination)}</span>
    </div>
  </div>
  <div class="flex-row flex-center-center">
    <div class="flex-column flex-center-center">
      <span class="weight-500">{$_('Message')}</span>
      <span class="message">{modalData.txData.params.message}</span>
    </div>
  </div>
  <div class="flex-row flow-buttons">
    <Button
      id="cancel-btn"
      class="button__solid button__secondary"
      {disabled}
      on:click={() => cancelTransaction()}>
      {$_('Cancel')}
    </Button>
    <Button
      id="save-btn"
      class="button__solid button__primary"
      {loading}
      on:click={() => sendTransaction()}>
      {$_('Send')}
    </Button>
  </div>
</div>
