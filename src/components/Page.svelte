<script>
  import "../common/i18n.js";
  import "./Styles.svelte";
  import { onMount, onDestroy, setContext, beforeUpdate } from "svelte";
  import { fade } from "svelte/transition";
  import { isLoading, _, locale } from "svelte-i18n";

  //Stores
  import {
    settingsStore,
    currentPage,
    currentThemeName,
  } from "../common/stores.js";

  import Onboarding from "./Pages/FirstRun/Onboarding.svelte";
  import Restore from "./Pages/FirstRun/Restore.svelte";
  import Backup from "./Pages/Backup/Backup.svelte";
  import IntroRestore from "./Pages/Restore/IntroRestore.svelte";
  import RestoreWallet from "./Pages/Restore/RestoreWallet.svelte";
  import AccountMain from "./Pages/Account/AccountMain.svelte";
  import AddNewAccount from "./Pages/Account/AddNewAccount.svelte";
  import AddNewNetwork from "./Pages/Network/AddNewNetwork.svelte";
  import LockScreen from "./Pages/Common/LockScreen.svelte";
  import Settings from "./Pages/Common/Settings.svelte";
  import About from "./Pages/Common/About.svelte";

  import Menu from "./Elements/Menu.svelte";

  const Pages = {
    LockScreen,

    // Integrated pages
    Onboarding,
    Restore, // for first run
    IntroRestore,
    AccountMain,
    About,
    AddNewNetwork,
    Settings,

    //full pages
    AddNewAccount,
    Backup,
    RestoreWallet,
  };

  const fullPage = ["AddNewAccount", "Backup", "RestoreWallet"];

  export const Modals = {};

  //Elements
  import Nav from "./Elements/Nav.svelte";
  import Modal from "./Elements/Modal.svelte";
  import Loading from "./Elements/Loading.svelte";
  import LightDarkToggle from "./Elements/LightDarkToggle.svelte";

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
      if (window.location.hash && window.location.hash.substr(1) != $currentPage.name) {
        switchPage(window.location.hash.substr(1));
        window.location = window.location.href.split("#")[0];
      }
      if (typeof Pages[$currentPage.name] == "undefined") {
        settingsStore.changePage({ name: "AccountMain" });
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
      firstRun = typeof isFirstRun == "boolean" ? isFirstRun : false;
      if (!firstRun && $currentPage.name === "Onboarding") {
        settingsStore.changePage({ name: "Backup" });
      }
      firstRun ? settingsStore.changePage({ name: "Onboarding" }) : null;
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
</script>

<style>
  .container {
    display: flex;
    padding-top: 6rem;
    flex-grow: 1;
  }

  .main-layout {
    display: flex;
    flex-direction: row;
    justify-content: left;
    flex-grow: 1;
  }

  .content-pane {
    padding: 21px 61px 0;
    flex-grow: 1;
    box-sizing: border-box;
  }

  .components {
    flex-grow: 1;
  }

  .footer-box {
    display: flex;
    flex-direction: row;
    justify-content: center;
    min-height: 70px;
    align-items: flex-start;
    margin-top: 20px;
  }

  .menu-pane {
    width: 83px;
    min-width: 83px;
    z-index: 29;
  }

  @media (min-width: 900px) {
    .menu-pane {
      width: 280px;
      min-width: 280px;
    }
  }
</style>

<div class="container">
  {#if !$isLoading && $locale && $loaded && typeof firstRun !== 'undefined'}
    {#if firstRun}
      <svelte:component this={Pages[$currentPage.name]} />
    {:else}
      {#if !walletIsLocked}
        {#if fullPage.includes($currentPage.name)}
          <svelte:component this={Pages[$currentPage.name]} />
        {:else}
          <Nav />
          <div class="main-layout">
            <div class="menu-pane">
              <Menu />
            </div>
            <div class="content-pane flex-column">
              <div class="components" in:fade={{ delay: 0, duration: 500 }}>
                <svelte:component this={Pages[$currentPage.name]} />
              </div>
              <div class="footer-box">
                <a
                  class="text-link text-caption text-secondary"
                  href="https://mytonwallet.com"
                  target="_blank"
                  rel="noopener noreferrer">
                  {$_('Learn more about this wallet app')}
                </a>
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
      {/if}
      {#if walletIsLocked}
        <svelte:component this={Pages['LockScreen']} {enabledPinPad} {loaded} />
      {/if}
    {/if}
  {:else}
    <Loading message="Loading" />
  {/if}
  <LightDarkToggle />
</div>
