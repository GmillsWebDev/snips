<script>
  import { onMount } from "svelte";
  import Button from "$lib/components/landing/Button.svelte";
  //import logo from "$lib/assets/images/branding/GMW_Logo.webp";
  let menuOpen = $state(false);
  let currentPath = $state("/");
  let logo = ""

  // Optional: Use SvelteKit's $page.url.pathname if available
  onMount(() => {
    currentPath = window.location.pathname;
  });


// { name: "Services", href: "/services" },
   const links = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Pricing", href: "/#Pricing" },
    { name: "Testimonials", href: "/#Testimonials" },
    { name: "Contact", href: "/#Footer" },
  ];

  function toggleMenu() {
    menuOpen = !menuOpen;
  }
</script>

<nav class="navbar">
  <div class="navbarContainer container">
    <a href="/">
      <div class="navbar__logo logo">
        <img src={logo} alt="Logo" />
      </div>
    </a>
    <div class="navbar__links {menuOpen ? 'active' : ''}">
      {#each links as link (link.name)}
        <a
          class="navbar__link {currentPath === link.href ? 'active' : ''}"
          href={link.href}
          on:click={() => {
            menuOpen = false;
            currentPath = link.href;
          }}
        >
          {link.name}
        </a>
      {/each}
      <Button 
        content="Sign in" 
        urlPath="/login" 
        variant="btnPrimary" />
    </div>
    <div
      class="hamburger {menuOpen ? 'active' : ''}"
      on:click={toggleMenu}
      on:keydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          toggleMenu();
        }
      }}
      aria-label="Toggle navigation"
      tabindex="0"
      role="button"
    >
      {#if menuOpen}
        <div class="bar cross1"></div>
        <div class="bar cross2"></div>
      {:else}
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    padding: 1rem 0;
    background-color: var(--colour-background);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    width: 100vw;
    position: relative;
    z-index: 10;
	border-bottom: 1px solid var(--colour-primary);
  }

  .navbarContainer {
    display: flex;
    margin: auto;
    justify-content: space-between;
    align-items: center;
  }

  .navbar__logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--colour-primary);
    img {
      width: 9rem;
      height: auto;
    }
  }

  .navbar__links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
	background: var(--colour-background);
    transition: none;
  }

  .navbar__link {
    text-decoration: none;
    color: var(--colour-white);
    position: relative;
    padding: 0.25rem 0;
    transition: color 0.2s;
  }

  .navbar__link.active::after {
    content: "";
    display: block;
    width: 100%;
    height: 3px;
    background-color: var(--colour-primary);
    position: absolute;
    bottom: -5px;
    left: 0;
  }

  .hamburger {
    display: none;
    flex-direction: column;
    cursor: pointer;
    margin-left: 1rem;
    transition: all 0.5s;
  }

  .bar {
    width: 25px;
    height: 2px;
    background-color: var(--colour-primary);
    margin: 2px 0;
    border-radius: 1px;
    transition: all 0.5s;
  }

    /* Hamburger active (cross) styles */
  .hamburger.active .cross1 {
    transform: rotate(45deg) translate(2px, 1px);
  }
  .hamburger.active .cross2 {
    transform: rotate(-45deg) translate(4px, -2px);
  }

  @media (max-width: 768px) {
    .navbar__links {
    display: none;
    opacity: 0;
    transform: translateX(100%);
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .hamburger {
      display: flex;
    }

    .navbar__links.active {
    display: flex;
    flex-direction: column;
    position: absolute;
    align-items: flex-start;
    top: 7rem;
    right: 0;
    box-shadow: -10px 11px 11px rgba(23, 59, 34, 0.4);
    width: fit-content;
    padding: 1rem 3rem;
    z-index: 9;
    opacity: 1;
    transform: translateX(0);
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .navbar__link {
      padding: 0.5rem 0 0.1rem 0;
    }
  }
</style>
