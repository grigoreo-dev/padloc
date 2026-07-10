import { expect, test } from "@playwright/test";
import { lock, login, signup, unlock } from "./helpers/auth";
import { deep, typeIn } from "./helpers/shadow";

const testItem = {
    name: "Google",
    username: "example@google.com",
    password: "somethingsecret",
    url: "https://google.com",
};

const itemSearch = {
    existing: "secret",
    nonexistent: "apple",
};

const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

test.describe("Items", () => {
    // Playwright isolates storage per test; Cypress shared the browser session.
    // Create persists account+item on the memory server; find re-auths then unlocks.
    test.describe.configure({ mode: "serial" });

    test("can create an item without errors", async ({ page }) => {
        await signup(page, email);

        const list = deep(page, "pl-app", "pl-items", "pl-items-list");
        // Header: menu, multi-select, add, search — prefer icon over fragile nth indices
        await list.locator('pl-button:has(pl-icon[icon="add"])').first().click({ force: true });

        const createDialog = deep(page, "pl-app", "pl-create-item-dialog");
        await expect(createDialog.locator("footer pl-button.primary")).toBeVisible({ timeout: 15_000 });
        await createDialog.locator("footer pl-button.primary").click({ force: true });

        await expect(page).toHaveURL(/\/items\//);
        await expect(page).toHaveURL(/\/new/);

        const itemView = deep(page, "pl-app", "pl-items", "pl-item-view");
        await expect(itemView.locator("pl-input#nameInput")).toBeVisible({ timeout: 15_000 });
        await typeIn(itemView.locator("pl-input#nameInput"), testItem.name);
        await typeIn(
            itemView
                .locator("pl-scroller pl-list pl-field")
                .nth(0)
                .locator("pl-input.value-input, pl-textarea.value-input"),
            testItem.username
        );
        await typeIn(
            itemView
                .locator("pl-scroller pl-list pl-field")
                .nth(1)
                .locator("pl-input.value-input, pl-textarea.value-input"),
            testItem.password
        );
        await typeIn(
            itemView
                .locator("pl-scroller pl-list pl-field")
                .nth(2)
                .locator("pl-input.value-input, pl-textarea.value-input"),
            testItem.url
        );
        await itemView.locator("pl-button.primary").click({ force: true });

        await expect(page).toHaveURL(/\/items\//);
        await expect(page).not.toHaveURL(/\/new/);
    });

    test("can find an item without errors", async ({ page }) => {
        // Fresh context: login restores session; lock+unlock matches Cypress unlock path after reload
        await login(page, email);
        await lock(page);
        await unlock(page, email);

        const list = deep(page, "pl-app", "pl-items", "pl-items-list");
        await list.locator('pl-button:has(pl-icon[icon="search"])').first().click({ force: true });
        await typeIn(list.locator("pl-input#filterInput"), itemSearch.existing);

        const rows = list.locator("main pl-virtual-list pl-scroller div.content > div");
        await expect(rows).toHaveCount(1);
        await expect(list.locator("pl-vault-item-list-item div.semibold").first()).toContainText(testItem.name);

        await list.locator("pl-input#filterInput pl-button.slim").click({ force: true });
        await list.locator('pl-button:has(pl-icon[icon="search"])').first().click({ force: true });
        await typeIn(list.locator("pl-input#filterInput"), itemSearch.nonexistent);

        await expect(list.locator("main > div.centering")).toContainText("did not match any items");
    });
});
