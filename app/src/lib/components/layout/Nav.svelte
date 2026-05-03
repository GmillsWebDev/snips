
<script lang="ts">
	import { page } from '$app/stores'

	let { links = [
		{ href: '/admin/dashboard', label: 'Dashboard', exact: true },
		{ href: '/admin/bookings', label: 'Bookings', exact: false },
		{ href: '/admin/services', label: 'Services', exact: false },
	], brand = 'Snips' } = $props()
</script>

<nav class="nav">
	<div class="navContainer">
        <span class="nav__brand">{brand}</span>
        <ul class="admin-nav__links">
            {#each links as link}
                <li>
                    <a
                        href={link.href}
                        class="admin-nav__link"
                        class:admin-nav__link--active={
                            link.exact
                                ? $page.url.pathname === link.href
                                : $page.url.pathname.startsWith(link.href)
                        }
                    >
                        {link.label}
                    </a>
                </li>
            {/each}
        </ul>
    </div>
</nav>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: var(--space-8);
		padding: 0 var(--space-6);
		height: 3rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

    .navContainer{
            max-width: var(--max-width-container);
            width: var(--width-container);
            margin: 3rem auto;
            display: flex;
            flex-direction: row;
        }

	.nav__brand {
		font-size: var(--font-size-md);
		font-weight: 700;
		color: var(--color-text);
		letter-spacing: -0.02em;
	}

	.admin-nav__links {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.admin-nav__link {
		display: inline-flex;
		align-items: center;
		padding: var(--space-1) var(--space-3);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text-muted);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: var(--transition);

		&:hover {
			color: var(--color-text);
			background: var(--color-surface-hover);
		}
	}

	.admin-nav__link--active {
		color: var(--color-text);
		background: var(--color-surface);
	}
</style>
