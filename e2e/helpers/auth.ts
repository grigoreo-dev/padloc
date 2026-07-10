import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { e2eEnv } from "./env";
import { clearEmails, getCodeFromEmail } from "./mail";
import { resetClientState } from "./reset";
import { deep } from "./shadow";

/** Fill a pl-input / pl-password-input host, ensuring the component value is set. */
async function fillField(host: Locator, text: string): Promise<void> {
    const field = host.locator("input, textarea").first();
    await field.fill(text);
    // BaseInput.value setter is async; also write the native input and notify parent forms.
    await host.evaluate(async (el: HTMLElement & { value: string; updateComplete?: Promise<unknown> }, t: string) => {
        el.value = t;
        const input = el.shadowRoot?.querySelector("input, textarea") as HTMLInputElement | null;
        if (input && input.value !== t) {
            input.value = t;
        }
        el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        await el.updateComplete;
    }, text);
    await expect.poll(async () => host.evaluate((el: { value: string }) => el.value), { timeout: 5_000 }).toBe(text);
}

async function setCheckbox(locator: Locator, checked = true): Promise<void> {
    await locator.evaluate((el: HTMLInputElement, val: boolean) => {
        el.checked = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    }, checked);
}

async function submitEmailForCode(page: Page, email: string): Promise<void> {
    const loginView = deep(page, "pl-app", "pl-start", "pl-login-signup");
    await expect(loginView.locator("#emailInput")).toBeVisible({ timeout: 30_000 });
    await fillField(loginView.locator("#emailInput"), email);
    await clearEmails();
    await loginView.locator("#submitEmailButton").click({ force: true });

    const prompt = deep(page, "pl-app", "pl-prompt-dialog");
    await expect(prompt).toBeVisible({ timeout: 45_000 });
    const code = await getCodeFromEmail({ timeout: 45_000 });
    await fillField(prompt.locator("pl-input").first(), code);
    await prompt.locator("#confirmButton").click({ force: true });

    await expect(page).toHaveURL(/authToken/, { timeout: 45_000 });
}

export async function signup(page: Page, email: string): Promise<void> {
    await resetClientState(page);
    await clearEmails();
    await page.goto("/");

    const login = deep(page, "pl-app", "pl-start", "pl-login-signup");
    await submitEmailForCode(page, email);

    // Name + TOS (consent drawer)
    const consent = login.locator("pl-drawer#consentDrawer");
    await expect(consent).toBeVisible({ timeout: 15_000 });
    await fillField(consent.locator("#nameInput"), e2eEnv.name);
    await setCheckbox(consent.locator("input#tosCheckbox"), true);
    await consent.locator("pl-button").filter({ hasText: "Create Account" }).click({ force: true });

    await expect(page).toHaveURL(/signup\/choose-password/, { timeout: 15_000 });

    // Choose a different password (open dialog via component API — Lit ghost buttons are flaky under force-click)
    await login.evaluate((el: { _editMasterPassword: () => void }) => {
        el._editMasterPassword();
    });

    const alert = deep(page, "pl-app", "pl-alert-dialog");
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await alert.locator("pl-button").filter({ hasText: "Choose My Own" }).click({ force: true });

    const masterPrompt = deep(page, "pl-app", "pl-prompt-dialog");
    await expect(masterPrompt).toBeVisible({ timeout: 10_000 });
    await fillField(masterPrompt.locator("pl-input[label='Enter Master Password']"), e2eEnv.password);
    await masterPrompt.locator("#confirmButton").click({ force: true });

    // Confirm weak password
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await alert.locator("pl-button").filter({ hasText: "Use Anyway" }).click({ force: true });
    await expect
        .poll(async () => login.evaluate((el: { _password: string }) => el._password), { timeout: 5_000 })
        .toBe(e2eEnv.password);

    await login.evaluate((el: { _submitPassword: () => void }) => {
        el._submitPassword();
    });
    await expect(page).toHaveURL(/signup\/confirm-password/, { timeout: 15_000 });

    const repeat = login.locator("pl-password-input#repeatPasswordInput");
    await expect(repeat).toBeVisible({ timeout: 10_000 });
    await fillField(repeat, e2eEnv.password);
    await expect
        .poll(async () => repeat.evaluate((el: { value: string }) => el.value), { timeout: 5_000 })
        .toBe(e2eEnv.password);

    await login.evaluate(async (el: { _confirmPassword: () => Promise<void> | void }) => {
        await el._confirmPassword();
    });

    await expect(page).toHaveURL(/\/signup\/success/, { timeout: 30_000 });
    await login.evaluate((el: { _done: () => void }) => {
        el._done();
    });
    await expect(page).toHaveURL(/\/items/, { timeout: 30_000 });
}

export async function login(page: Page, email: string): Promise<void> {
    await resetClientState(page);
    await clearEmails();
    await page.goto("/");

    const loginView = deep(page, "pl-app", "pl-start", "pl-login-signup");
    await submitEmailForCode(page, email);

    // Prefer the password field over URL — routing can briefly hit other paths.
    const passwordInput = loginView.locator("pl-password-input#loginPasswordInput");
    await expect(passwordInput).toBeVisible({ timeout: 45_000 });
    await fillField(passwordInput, e2eEnv.password);
    const loginButton = loginView.locator("pl-button#loginButton");
    await expect
        .poll(async () => loginButton.evaluate((el: HTMLElement) => !el.hasAttribute("disabled")), { timeout: 10_000 })
        .toBe(true);
    await loginButton.click({ force: true });

    // Trusted-device prompt or straight to vault
    const alert = deep(page, "pl-app", "pl-alert-dialog");
    const itemsUrl = page.waitForURL(/\/items/, { timeout: 45_000 });
    const trustedPrompt = alert
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(async () => {
            await alert.locator("pl-button").filter({ hasText: "Yes" }).click({ force: true });
        })
        .catch(() => undefined);
    await Promise.race([itemsUrl, trustedPrompt.then(() => itemsUrl)]);
    await expect(page).toHaveURL(/\/items/, { timeout: 45_000 });
}

export async function lock(page: Page): Promise<void> {
    await page.goto("/items");
    // Desktop: menu is already visible. Mobile: open via menu-button first (force for CSS-hidden).
    const list = deep(page, "pl-app", "pl-items", "pl-items-list");
    const menuButton = list.locator("pl-button.menu-button").first();
    if (await menuButton.isVisible().catch(() => false)) {
        await menuButton.click({ force: true });
    } else {
        await menuButton.dispatchEvent("click").catch(() => undefined);
    }
    const menu = deep(page, "pl-app", "pl-menu");
    await menu.locator("pl-button").filter({ hasText: "Lock" }).click({ force: true });
    await expect(page).toHaveURL(/\/unlock/, { timeout: 15_000 });
}

export async function unlock(page: Page, email: string): Promise<void> {
    await page.goto("/");
    const unlockView = deep(page, "pl-app", "pl-start", "pl-unlock");
    await expect(unlockView.locator("pl-input[label='Logged In As']").locator("input")).toHaveValue(email, {
        timeout: 15_000,
    });
    await fillField(unlockView.locator("pl-password-input#passwordInput"), e2eEnv.password);
    await unlockView.locator("pl-button#unlockButton").click({ force: true });
    await expect(page).toHaveURL(/\/items/, { timeout: 30_000 });
}
