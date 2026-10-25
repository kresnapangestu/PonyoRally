import { createRepository, type Repository } from "./repository";
import { browserStorage } from "./storage";

let repository: Repository | null = null;
let persistent = true;

/** The app-wide repository, created on first use in the browser. */
export function getRepository(): Repository {
  if (!repository) {
    const browser = browserStorage();
    persistent = browser.persistent;
    repository = createRepository(browser.storage);
    // Ask the browser not to clear our data under storage pressure (best effort).
    void navigator.storage?.persist?.().catch(() => undefined);
  }
  return repository;
}

/** False when the browser blocks storage: data will not survive a reload. */
export function isStoragePersistent() {
  getRepository();
  return persistent;
}
