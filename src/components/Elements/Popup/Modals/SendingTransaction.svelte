<script>
  import { onMount, getContext, afterUpdate } from "svelte";
  import { _ } from "svelte-i18n";
  import Select from "../../Select";

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
  let fee = 0;
  let total = 0;
  let allBalance = false;
  let disabled = true;

  //Context
  const { closeModal, openModal } = getContext("app_functions");

  let complexItems = [];

  const loadSelectAddressesList = () => {
    browser.runtime
      .sendMessage({
        type: "getAllAccounts",
        data: ["nickname", "address"],
      })
      .then((result) => {
        complexItems = [];
        for (let i in result) {
          if (result[i].address == $currentAccount.address) {
            continue;
          }
          complexItems.push({
            value: result[i].address,
            label: result[i].nickname,
            group: $_("Own addresses"),
          });
        }
        //'Favorite address'
        //'Favorite smart contract'
      });
  };

  onMount(() => {
    destination = document.getElementById("sending-tx-destination");
    amount = document.getElementById("sending-tx-amount");
    message = document.getElementById("sending-tx-message");
    loadSelectAddressesList();
  });

  currentAccount.subscribe((value) => {
    loadSelectAddressesList();
  });

  const setMax = () => {
    amount.value = fromNano(
      $currentAccount.balance[$currentNetwork.server]
        ? $currentAccount.balance[$currentNetwork.server]
        : 0
    );
    allBalance = true;
    calculateFee();
  };

  const validateAddressSelect = (event) => {
    if (event.detail == null) {
      disabled = true;
      return;
    }
    const rawAddress = new RegExp(/-?[0-9]{0,10}:[a-fA-F0-9]{64}/);
    const base64Address = new RegExp(/[_\-\/\+a-zA-Z0-9]{48}/);
    if (
      new String(event.detail.value).match(rawAddress) ||
      new String(event.detail.value).match(base64Address)
    ) {
      disabled = false;
      destination.dataset.value = event.detail.value;
      calculateFee();
    } else {
      disabled = true;
    }
  };

  const validateAddress = (event) => {
    const rawAddress = new RegExp(/-?[0-9]{0,10}:[a-fA-F0-9]{64}/);
    const base64Address = new RegExp(/[_\-\/\+a-zA-Z0-9]{48}/);
    if (
      new String(destination.value).match(rawAddress) ||
      new String(destination.value).match(base64Address)
    ) {
      disabled = false;
      destination.dataset.value = destination.value;
      calculateFee();
    } else {
      disabled = true;
    }
  };

  const calculateFee = () => {
    if (amount.value == "") {
      return;
    }
    browser.runtime
      .sendMessage({
        type: "calculateFeeForSafeMultisig",
        data: {
          accountAddress: $currentAccount.address,
          server: $currentNetwork.server,
          txData: {
            type: "send",
            params: {
              amount: toNano(amount.value),
              message: message.value,
              destination: destination.dataset.value,
              allBalance: allBalance,
            },
          },
        },
      })
      .then((result) => {
        fee = result.error ? 0 : fromNano(result.fee.total_account_fees);
        if (allBalance) {
          const maxBalance = $currentAccount.balance[$currentNetwork.server] ? $currentAccount.balance[$currentNetwork.server]: 0;
          amount.value = fromNano(maxBalance - toNano(fee));
          total = fromNano(maxBalance);
        } else {
          total = fromNano(toNano(amount.value) + toNano(fee));
        }
      });
  };

  const cancelTransaction = () => {
    closeModal();
  };

  const confirmTransaction = () => {
    openModal("ModalConfirmTransaction", {
      accountAddress: $currentAccount.address,
      server: $currentNetwork.server,
      fee: fee,
      txData: {
        type: "send",
        params: {
          amount: toNano(amount.value),
          message: message.value,
          destination: destination.dataset.value,
          allBalance: allBalance,
        },
      }
    });
  };

  const groupBy = (item) => item.group;
</script>

<style>
  .sending-tx-total-wrapper {
    align-content: center;
    display: flex;
    justify-content: center;
    font-size: 1em;
    font-weight: bold;
    margin-bottom: 1em;
  }
  #sending-tx-fee,
  #sending-tx-total {
    flex-direction: row;
  }
  #sending-tx-fee {
    margin-right: 1rem;
    font-weight: 300px;
  }
  #sending-tx-total {
    margin-left: 1rem;
  }
</style>

<div class="sending-tx flex-column">
  <h6>{$_('Send transaction')}</h6>
  <Field label={$_('Address')}>
    <Select
      id="sending-tx-destination"
      items={complexItems}
      {groupBy}
      required
      placeholder={$_('Select or enter a new one') + '...'}
      noOptionsMessage={$_('No matches')}
      on:select={validateAddressSelect}
      on:clear={validateAddressSelect}
      on:keyup={validateAddress} />
  </Field>
  <Field label={$_('Amount')} gapless>
    <Button on:click={() => setMax()} outline>{$_('Max')}</Button>
    <Input
      required
      number
      step="any"
      on:keyup={() => {
        allBalance = false;
        calculateFee();
      }}
      id="sending-tx-amount" />
  </Field>
  <div class="sending-tx-total-wrapper">
    <div id="sending-tx-fee">{$_('Fee')} ~ {fee}</div>
    <div id="sending-tx-total">{$_('Total')} {total}</div>
  </div>
  <Field label={$_('Message')}>
    <Input id="sending-tx-message" />
  </Field>
  <div class="flex-row flow-buttons">
    <Button
      id="cancel-btn"
      class="button__solid button__secondary"
      on:click={() => cancelTransaction()}>
      {$_('Cancel')}
    </Button>
    <Button
      id="save-btn"
      class="button__solid button__primary"
      {disabled}
      on:click={() => confirmTransaction()}>
      {$_('Confirm')}
    </Button>
  </div>
</div>
