/**
 * Karbantartási időszakok és időpontok ellenőrzése.
 */
export const MAINTENANCE_START_TIME = new Date('2026-10-26T10:00:00');
export const MAINTENANCE_END_TIME = new Date('2026-10-26T16:00:00');

/**
 * A regisztráció blokkolva van és a felirat látható: 10.26. 10:00-tól 16:00-ig.
 */
export const isRegistrationBlocked = () => {
  const now = new Date();
  return now >= MAINTENANCE_START_TIME && now < MAINTENANCE_END_TIME;
};

/**
 * A figyelmeztető sáv megjelenítése a karbantartás végéig (10.26. 16:00-ig).
 */
export const isAnnouncementActive = () => {
  return new Date() < MAINTENANCE_END_TIME;
};

// Visszafelé kompatibilitás
export const isMaintenanceActive = isRegistrationBlocked;
