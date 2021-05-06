<script>
  import { getContext } from "svelte";

  //Context
  const { switchPage, firstRun } = getContext("app_functions");

  $: clickable = !firstRun();

  const goHome = () => {
    if (clickable) switchPage("AccountMain");
  };
</script>

<style lang="scss">
  .box {
    width: 50px;
    height: 100%;
    justify-content: center;
  }

  .brand {
    align-items: center;
  }

  .logo {
    margin-left: 1rem;
    width: 48px;
    height: 48px;
    img {
      width: 100%;
      height: 100%;
    }
  }
</style>

<div class="box flex-column">
  <div class="brand" class:clickable on:click={() => goHome()}>
    <div class="logo"><img src="/assets/img/icon-128.png" alt="logo" /></div>
  </div>
</div>
