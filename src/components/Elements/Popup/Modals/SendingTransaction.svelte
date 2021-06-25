<script>
  import { onMount, getContext, afterUpdate } from "svelte";
  import { _ } from "svelte-i18n";

  //Stores
  import {
    accountStore,
    currentAccount,
    currentNetwork,
  } from "../../../../common/stores.js";

  import { fromNano, toNano } from "../../../../common/utils.js";

  //Components
  import { Field, Button, Input } from "svelte-chota";

  let destination, amount, message;
  let loading = false;
  let allBalance = false;
  let disabled = true;

  //Context
  const { closeModal, openModal } = getContext("app_functions");

  onMount(() => {
    destination = document.getElementById("sending-tx-destination");
    amount = document.getElementById("sending-tx-amount");
    message = document.getElementById("sending-tx-message");
  });

  const setMax = () => {
    amount.value = fromNano(
      $currentAccount.balance[$currentNetwork.server]
        ? $currentAccount.balance[$currentNetwork.server]
        : 0
    );
    allBalance = true;
  };

  const validateAddress = () => {
    const rawAddress = new RegExp(/-?[0-9]{0,10}:[a-fA-F0-9]{64}/);
    const base64Address = new RegExp(/[_\-\/\+a-zA-Z0-9]{48}/);
    if (
      new String(destination.value).match(rawAddress) ||
      new String(destination.value).match(base64Address)
    ) {
      disabled = false;
    } else {
      disabled = true;
    }
  };

  const sendTransaction = () => {
    loading = true;
    browser.runtime
      .sendMessage({
        type: "sendTransaction",
        data: {
          accountAddress: $currentAccount.address,
          server: $currentNetwork.server,
          txData: {
            type: "send",
            params: {
              amount: toNano(amount.value),
              message: message.value,
              destination: destination.value,
              allBalance: allBalance,
            },
          },
        },
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
              newCurrentAccount.balance[$currentNetwork.server] = fromNano(
                result
              );
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
</style>

<div class="sending-tx flex-column">
  <h6>{$_('Send transaction')}</h6>
  <Field label={$_('Address')}>
    <Input
      required
      id="sending-tx-destination"
      on:keyup={() => {
        validateAddress();
      }} />
  </Field>
  <Field label={$_('Amount')} gapless>
    <Button on:click={() => setMax()} outline>{$_('Max')}</Button>
    <Input
      required
      number
      step="any"
      on:keyup={() => {
        allBalance = false;
      }}
      id="sending-tx-amount" />
  </Field>
  <Field label={$_('Message')}>
    <Input id="sending-tx-message" />
  </Field>
  <div class="flex-column flow-buttons">
    <Button
      id="save-btn"
      class="flex-row flex-center-centr button__solid button__primary"
      {disabled}
      {loading}
      on:click={() => sendTransaction()}>
      {$_('Send')}
    </Button>
  </div>
</div>
