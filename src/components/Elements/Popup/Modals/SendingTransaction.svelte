<script>
  import { onMount, getContext, afterUpdate } from "svelte";
  import { _ } from "svelte-i18n";

  //Stores
  import {
    accountStore,
    currentAccount,
    currentNetwork,
  } from "../../../../common/stores.js";

  import { fromNano } from "../../../../common/utils.js";

  //Components
  import { Field, Button, Input } from "svelte-chota";

  let destination, amount, message;
  let loading = false;

  //Context
  const { closeModal, openModal } = getContext("app_functions");

  onMount(() => {
    destination = document.getElementById("sending-tx-destination");
    amount = document.getElementById("sending-tx-amount");
    message = document.getElementById("sending-tx-message");
  });

  const sendTransaction = () => {
    loading = true;
    browser.runtime.sendMessage({type: "sendTransaction",
      data: {"accountAddress": $currentAccount.address,
        "server": $currentNetwork.server,
        "txData": {
          "type": "send",
          "params": {
            "amount": amount.value,
            "message": message.value,
            "destination": destination.value
          }
        }
      }
    })
      .then((result) => {
        loading = false;
        closeModal();
        if (result.error) {
          openModal("ModalError", {"message" : result.error});
        } else {
          browser.runtime
            .sendMessage({ type: "getCurrentBalance", data: {"accountAddress": $currentAccount.address, "server": $currentNetwork.server} })
            .then((result) => {
              const newCurrentAccount = $currentAccount;
              newCurrentAccount.balance[$currentNetwork.server] = fromNano(result);
              accountStore.changeAccount(newCurrentAccount);
            }).catch((e) => {
              console.log(e); // here don't need to show any error for user, usually it is the network issue in the development environment
            });
        }
      });
  };
</script>

<style>
</style>

<div class="sending-tx flex-column">
  <h6> {$_("Send transaction")} </h6>
  <Field label="{$_("Address")}">
    <Input required id="sending-tx-destination" />
  </Field>
  <Field label="{$_("Amount")}">
    <Input required number id="sending-tx-amount" />
  </Field>
  <Field label="{$_("Message")}">
    <Input id="sending-tx-message" />
  </Field>
  <div class="flex-column flow-buttons">
    <Button
        id="save-btn"
        class="flex-row flex-center-centr button__solid button__primary"
        loading={loading}
        on:click={() => sendTransaction()}>
        {$_("Send")}
    </Button>
  </div>
</div>
