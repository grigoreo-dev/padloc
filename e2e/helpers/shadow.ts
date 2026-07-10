import type { Locator, Page } from "@playwright/test";

/** Chain locators; Playwright pierces open shadow roots between custom elements. */
export function deep(page: Page, ...selectors: string[]): Locator {
    if (selectors.length === 0) {
        throw new Error("deep() requires at least one selector");
    }
    let loc = page.locator(selectors[0]);
    for (let i = 1; i < selectors.length; i++) {
        loc = loc.locator(selectors[i]);
    }
    return loc;
}

export async function typeIn(host: Locator, text: string): Promise<void> {
    const field = host.locator("input, textarea").first();
    await field.fill(text);
}
