import { test } from "@playwright/test";
import { lock, login, signup, unlock } from "./helpers/auth";

test.describe("Signup/Login", () => {
    const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

    test("can signup without errors", async ({ page }) => {
        await signup(page, email);
    });

    test("can login without errors", async ({ page }) => {
        await login(page, email);
    });

    test("can lock/unlock without errors", async ({ page }) => {
        await login(page, email);
        await lock(page);
        await unlock(page, email);
    });
});
