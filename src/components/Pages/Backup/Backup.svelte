<script>
  import { setContext, getContext, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  //Components
  import Steps from "../../Elements/Steps.svelte";
  import Step from "../../Elements/Steps.svelte";
  import Logo from "../../Elements/Logo.svelte";

  import IntroBackup from "./IntroBackup.svelte";
  import ViewKeys from "./ViewKeys.svelte";
  import KeystorePassword from "./KeystorePassword.svelte";
  import KeystoreCreate from "./KeystoreCreate.svelte";
  import KeystoreComplete from "./KeystoreComplete.svelte";

  //Context
  const { switchPage } = getContext("app_functions");

  setContext("functions", {
    changeStep: (step) => {
      if (step === 0 && currentStep === 0) {
        switchPage("Backup");
      } else if (step === 0) {
        currentStep = back;
      } else {
        currentStep = step;
      }
    },
    setKeystorePassword: (info) => (keystorePasswordInfo = info),
    //getKeystorePW: () => {return keystorePasswordInfo},
    setKeystoreFile: (file) => (keystoreFile = file),
  });

  let currentStep = 0;
  let keystorePasswordInfo;
  let keystoreFile;
  let password;

  onDestroy(() => (password = ""));

  let steps = [
    { page: IntroBackup, hideSteps: true, back: 0 },
    { page: ViewKeys, hideSteps: true, back: 0 },
    { page: KeystorePassword, hideSteps: false, back: 0 },
    { page: KeystoreCreate, hideSteps: false, back: 3 },
    { page: KeystoreComplete, hideSteps: false, back: 0 },
  ];

  $: currentPage = steps[currentStep].page;
  $: hideSteps = steps[currentStep].hideSteps;
  $: back = steps[currentStep].back;
  $: hideBack = steps[currentStep].hideBack ? false : true;
</script>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .content {
    flex-grow: 1;
    display: flex;
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
    height: 6rem;
    border-bottom: 1px solid var(--divider-light);
  }

  .steps {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .hide-steps {
    display: none;
  }
</style>

<div class="layout">
  <div class="header">
    <Logo />
  </div>
  <div class="content">
    <svelte:component
      this={currentPage}
      {keystoreFile}
      {keystorePasswordInfo} />
  </div>
  <div class="steps" class:hide-steps={hideSteps}>
    <Steps {back} {hideBack} />
  </div>
</div>
