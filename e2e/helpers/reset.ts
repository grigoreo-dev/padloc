import type { Page } from "@playwright/test";

export async function resetClientState(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(async () => {
        localStorage.clear();
        sessionStorage.clear();
        const dbs = await indexedDB.databases();
        await Promise.all(
            dbs.map(
                (db) =>
                    new Promise<void>((resolve, reject) => {
                        if (!db.name) {
                            resolve();
                            return;
                        }
                        const req = indexedDB.deleteDatabase(db.name);
                        req.onsuccess = () => resolve();
                        req.onerror = () => reject(req.error);
                        req.onblocked = () => resolve();
                    })
            )
        );
    });
}
