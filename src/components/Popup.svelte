<script>
  import "../common/i18n.js";
  import "./Styles.svelte";
  import { onMount, onDestroy, setContext, beforeUpdate } from "svelte";
  import { fade } from "svelte/transition";
  import { isLoading, _ , locale } from "svelte-i18n";

  //Stores
  import {
    settingsStore,
    currentPage,
    currentThemeName,
  } from "../common/stores.js";

  import PopupMain from "./Pages/Popup/PopupMain.svelte";
  import LockScreen from "./Pages/Popup/LockScreen.svelte";

  const Pages = {
    PopupMain,
    LockScreen,
  };

  //Elements
  import Nav from "./Elements/Popup/Nav.svelte";
  import Modal from "./Elements/Modal.svelte";
  import Loading from "./Elements/Loading.svelte";
  import LightDarkToggle from "./Elements/LightDarkToggle.svelte";

  //Modals
  import ModalEditNickname from "./Elements/Popup/Modals/EditNickname.svelte";
  import ModalDeleteAccount from "./Elements/Popup/Modals/DeleteAccount.svelte";
  import ModalError from "./Elements/Popup/Modals/Error.svelte";
  import ModalSuccess from "./Elements/Popup/Modals/Success.svelte";
  import ModalSendingTransaction from "./Elements/Popup/Modals/SendingTransaction.svelte";
  import ModalConfirmTransaction from "./Elements/Popup/Modals/ConfirmTransaction.svelte";

  export let loaded;

  let showModal = false;
  let currentModal;
  let modalData;

  $: walletIsLocked = true;
  $: enabledPinPad = false;
  $: firstRun = undefined;

  const walletIsLockedListener = (message) => {
    if (message.type === "walletIsLocked") {
      //Make sure the wallet was actually unlocked by the user
      browser.runtime.sendMessage({ type: "walletIsLocked" }).then((data) => {
        walletIsLocked = data.locked;
        enabledPinPad = data.enabledPinPad;
      });
    }
  };

  browser.runtime.onMessage.addListener(walletIsLockedListener);

  onMount(() => {
    browser.runtime.sendMessage({ type: "walletIsLocked" }).then((data) => {
      walletIsLocked = data.locked;
      enabledPinPad = data.enabledPinPad;
    });
    checkFirstRun();
  });

  beforeUpdate(() => {
    if (settingsStore.initialized()) {
      const body = document.getElementById("theme-toggle");
      const theme = $currentThemeName;
      if (theme == "light") {
        body.classList.add("light");
      }
    }
  });

  onDestroy(() => {
    browser.runtime.onMessage.removeListener(walletIsLockedListener);
  });

  setContext("app_functions", {
    switchPage: (name, data) => switchPage(name, data),
    openModal: (modal, data) => openModal(modal, data),
    getModalData: () => {
      return modalData;
    },
    closeModal: () => (showModal = false),
    firstRun: () => (firstRun ? true : false),
    appHome: () => switchPage("AccountMain"),
    checkFirstRun: () => checkFirstRun(),
    themeToggle: themeToggle,
  });

  const checkFirstRun = () => {
    browser.runtime.sendMessage({ type: "isFirstRun" }).then((isFirstRun) => {
      firstRun = isFirstRun;
      if (firstRun) {
        const openApp = () => {
          browser.tabs.create({ url: "/page.html" });
        };
        browser.tabs.query({}).then((tabs) => {
          const foundTab = tabs.find((tab) => {
            if (typeof tab.url !== "undefined") {
              return tab.url.includes(
                `chrome-extension://${browser.runtime.id}/page.html`
              );
            } else {
              return false;
            }
          });

          if (foundTab) {
            browser.tabs.update(foundTab.id, { highlighted: true });
          } else {
            openApp();
          }
        });
      } else {
        settingsStore.changePage({ name: "PopupMain" });
      }
    });
  };

  const switchPage = (name, data) => {
    showModal = false;
    settingsStore.changePage({ name, data });
  };

  const openModal = (modal, data) => {
    currentModal = modal;
    modalData = data;
    showModal = true;
  };

  const closeModal = () => {
    showModal = false;
  };

  function themeToggle() {
    const body = document.getElementById("theme-toggle");
    const theme = $currentThemeName;
    if (theme == "dark") {
      body.classList.add("light");
      settingsStore.setThemeName("light");
      // need to change storage on background
      browser.runtime
        .sendMessage({ type: "setSettings", data: {
          "setThemeName": "light",
        }});
    } else {
      body.classList.remove("light");
      settingsStore.setThemeName("dark");
      // need to change storage on background
      browser.runtime
        .sendMessage({ type: "setSettings", data: {
          "setThemeName": "dark",
        }});
    }
  }

  const Modals = { ModalEditNickname, ModalDeleteAccount, ModalError, ModalSuccess, ModalSendingTransaction, ModalConfirmTransaction };

</script>

<style>
  .container {
    display: flex;
    padding-top: 4rem;
    flex-grow: 1;
    width:350px;
    height:550px;
  }

  .main-layout {
    display: flex;
    flex-direction: row;
    justify-content: left;
    flex-grow: 1;
  }

  .content-pane {
    padding: 20px 0px 0;
    flex-grow: 1;
    box-sizing: border-box;
  }

  .components {
    flex-grow: 1;
  }

</style>

<div class="container">
  {#if !$isLoading && $loaded && $locale && typeof firstRun !== 'undefined'}
    {#if firstRun}
      <svelte:component this={Pages[$currentPage.name]} />
    {:else}
      {#if !walletIsLocked}
        <Nav />
        <div class="main-layout">
          <div class="content-pane flex-column">
            <div class="components" in:fade={{ delay: 0, duration: 500 }}>
              <svelte:component this={Pages[$currentPage.name]} />
            </div>
          </div>
          {#if showModal}
            <Modal>
              <svelte:component
                this={Modals[currentModal]}
                {modalData}
                {closeModal} />
            </Modal>
          {/if}
        </div>
      {/if}
      {#if walletIsLocked}
        <svelte:component this={Pages['LockScreen']} {enabledPinPad} {loaded} />
      {/if}
    {/if}
  {:else}
    <Loading message="..." />
  {/if}
  <LightDarkToggle size="1" orientation="bottom" />
</div>
