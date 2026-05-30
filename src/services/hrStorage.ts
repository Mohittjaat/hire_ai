// src/services/hrStorage.ts

/**
 * Utility service to provide namespaced localStorage keys 
 * unique to the currently logged-in HR user.
 */
export const hrStorage = {
  // Get the current logged-in HR's email from session storage
  getCurrentHREmail(): string {
   return localStorage.getItem("currentHREmail") || sessionStorage.getItem("currentHREmail") || "guest_hr";
  },

  // Generates a namespaced key string (e.g., "allJobs_mohit@company.com")
  getKey(baseKey: string): string {
    const email = this.getCurrentHREmail();
    return `${baseKey}_${email}`;
  },

  // Namespaced Get Item
  getItem(baseKey: string): string | null {
    const namespacedKey = this.getKey(baseKey);
    return localStorage.getItem(namespacedKey);
  },

  // Namespaced Set Item
  setItem(baseKey: string, value: string): void {
    const namespacedKey = this.getKey(baseKey);
    localStorage.setItem(namespacedKey, value);
  },

  // Namespaced Remove Item
  removeItem(baseKey: string): void {
    const namespacedKey = this.getKey(baseKey);
    localStorage.removeItem(namespacedKey);
  }
};