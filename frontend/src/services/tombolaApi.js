/**
 * Brickathlon Tombola / Lottery Service
 * 
 * Backend API: https://brickathlon.runasp.net/api/Lottery
 * - GET    /api/Lottery                      -> Összes kiadott tombola lekérése
 * - GET    /api/Lottery/bycompetitor/{email} -> Adott versenyző tomboláinak lekérése
 * - POST   /api/Lottery/{email}              -> Új tombola kiadása a versenyzőnek
 * - PUT    /api/Lottery/{code}               -> Tombola kihúzása / érvényesítése (isPulledOut: 1)
 * - DELETE /api/Lottery/{code}               -> Tombola törlése / visszavonása
 * 
 * Szabály: Egy ember / email legfeljebb 2-szer nyerhet (MAX_WINS_PER_RECIPIENT = 2).
 */

const LOTTERY_API = 'https://brickathlon.runasp.net/api/Lottery';
const TICKETS_CACHE_KEY = 'brickathlon_tombola_tickets_v1';
const SURVEY_SUBMISSIONS_KEY = 'brickathlon_survey_submissions_v1';
const WINNERS_KEY = 'brickathlon_tombola_winners_v1';

export const TOMBOLA_CHANGED_EVENT = 'brickathlonTombolaChanged';
export const TOMBOLA_STORAGE_EVENT = TOMBOLA_CHANGED_EVENT;
export const MAX_WINS_PER_RECIPIENT = 2;

/**
 * Normalizálja a backendről vagy cache-ből érkező tombolajegyet egységes formátumra
 */
export const normalizeTicket = (item) => {
  if (!item) return null;
  const isPulled = Number(item.isPulledOut) === 1 || Boolean(item.isWinner);
  return {
    id: item.code || `tomb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    code: item.code || '',
    name: item.name || item.recipientName || '',
    recipientName: item.name || item.recipientName || '',
    email: item.email || item.userEmail || item.recipientEmail || '',
    userEmail: item.email || item.userEmail || item.recipientEmail || '',
    recipientEmail: item.email || item.userEmail || item.recipientEmail || '',
    teamName: item.teamName || '',
    teamId: item.teamId || null,
    isPulledOut: isPulled ? 1 : 0,
    isWinner: isPulled,
    reasonType: item.reasonType || 'activity',
    reasonLabel: item.reasonLabel || (isPulled ? 'Kihúzott nyertes szelvény' : 'Játékban lévő szelvény'),
    wonPrize: item.wonPrize || item.prizeName || (isPulled ? 'Tombola Nyeremény' : null),
    wonRound: item.wonRound || null,
    wonAt: item.wonAt || null,
    createdAt: item.createdAt || new Date().toISOString()
  };
};

/**
 * Szinkron módon visszaadja a gyorsítótárazott szelvényeket (azonnali UI rendereléshez)
 */
export const getAllTickets = () => {
  try {
    const raw = localStorage.getItem(TICKETS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTicket) : [];
  } catch {
    return [];
  }
};

/**
 * Backendről aszinkron módon lekéri és frissíti a szelvényeket
 */
export const fetchTicketsFromBackend = async () => {
  try {
    const res = await fetch(LOTTERY_API, {
      headers: { accept: '*/*' }
    });
    if (!res.ok) {
      throw new Error(`Nem sikerült betölteni a tombolákat: HTTP ${res.status}`);
    }
    const data = await res.json();
    const normalized = (Array.isArray(data) ? data : []).map(normalizeTicket);
    localStorage.setItem(TICKETS_CACHE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (err) {
    console.warn('Backend tombola lekérés sikertelen, helyi cache használata:', err.message);
    return getAllTickets();
  }
};

/**
 * Adott versenyző tomboláinak lekérése a backendről
 */
export const getTicketsByCompetitor = async (email) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return [];

  try {
    const res = await fetch(`${LOTTERY_API}/bycompetitor/${encodeURIComponent(cleanEmail)}`, {
      headers: { accept: '*/*' }
    });
    if (!res.ok) {
      // Ha 404 vagy más, fallback a helyi szűrésre
      const all = getAllTickets();
      return all.filter((t) => t.email.toLowerCase() === cleanEmail);
    }
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(normalizeTicket);
  } catch {
    const all = getAllTickets();
    return all.filter((t) => t.email.toLowerCase() === cleanEmail);
  }
};

export const getTicketsForUserOrTeam = async ({ userEmail = '', teamName = '' }) => {
  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  const cleanTeam = String(teamName || '').trim().toLowerCase();

  let tickets = [];
  if (cleanEmail) {
    tickets = await getTicketsByCompetitor(cleanEmail);
  }
  if (tickets.length === 0) {
    const all = await fetchTicketsFromBackend();
    tickets = all.filter((t) => {
      if (cleanEmail && t.email.toLowerCase() === cleanEmail) return true;
      if (cleanTeam && t.teamName && t.teamName.toLowerCase() === cleanTeam) return true;
      return false;
    });
  }
  return tickets;
};

/**
 * Új tombolajegy kiadása a versenyzőnek a backend POST /api/Lottery/{email} végponton
 */
export const awardTicket = async ({
  teamId = null,
  teamName = '',
  recipientName = '',
  userEmail = '',
  reasonType = 'try_activity',
  reasonLabel = 'Kipróbált valamit',
  awardedBy = 'Segítő'
}) => {
  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('A versenyző email címe kötelező a tombola kiadásához.');
  }

  // 1. Backend hívás
  const res = await fetch(`${LOTTERY_API}/${encodeURIComponent(cleanEmail)}`, {
    method: 'POST',
    headers: { accept: '*/*' }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Nem sikerült kiadni a tombolát a backend szerveren.');
  }

  // 2. Frissítjük a jegyeket a backendről
  const updatedList = await fetchTicketsFromBackend();
  // Keressük meg a frissen kiadott jegyet
  const userTickets = updatedList.filter((t) => t.email.toLowerCase() === cleanEmail);
  const newestTicket = userTickets[userTickets.length - 1] || {
    code: 'OK',
    recipientName: recipientName || 'Versenyző',
    email: cleanEmail,
    isPulledOut: 0,
    isWinner: false,
    reasonLabel
  };

  window.dispatchEvent(new Event(TOMBOLA_CHANGED_EVENT));
  return newestTicket;
};

export const awardTombolaTicket = awardTicket;

/**
 * Tombola törlése a backendről DELETE /api/Lottery/{code}
 */
export const deleteTombolaTicket = async (code) => {
  const cleanCode = String(code || '').trim();
  if (!cleanCode) return false;

  const res = await fetch(`${LOTTERY_API}/${encodeURIComponent(cleanCode)}`, {
    method: 'DELETE',
    headers: { accept: '*/*' }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Nem sikerült törölni a tombolát.');
  }

  await fetchTicketsFromBackend();
  window.dispatchEvent(new Event(TOMBOLA_CHANGED_EVENT));
  return true;
};

/**
 * Elmentett sorsolási előzmények lekérése a pontos időrend megtartásához
 */
export const getSavedWinnersHistory = () => {
  try {
    const raw = localStorage.getItem(WINNERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Tombola kihúzása / nyertessé tétele PUT /api/Lottery/{code}
 */
export const pullOutTicket = async (code) => {
  const cleanCode = String(code || '').trim();
  if (!cleanCode) return false;

  const res = await fetch(`${LOTTERY_API}/${encodeURIComponent(cleanCode)}`, {
    method: 'PUT',
    headers: { accept: '*/*' }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Nem sikerült érvényesíteni a tombolát a szerveren.');
  }

  // Rögzítjük a helyi előzményekben a pontos húzási sorrendet
  try {
    const history = getSavedWinnersHistory().filter((w) => w.code !== cleanCode);
    history.push({ code: cleanCode, isWinner: true, isPulledOut: 1, wonAt: new Date().toISOString() });
    localStorage.setItem(WINNERS_KEY, JSON.stringify(history));
  } catch {}

  await fetchTicketsFromBackend();
  window.dispatchEvent(new Event(TOMBOLA_CHANGED_EVENT));
  return true;
};

/**
 * Nyertesek listájának lekérése pontos kronológiai sorrendben (legkorábbitól a legutóbbiig)
 */
export const getWinners = () => {
  const all = getAllTickets();
  const pulledOutMap = new Map();
  all.forEach((t) => {
    if (t.isWinner || Number(t.isPulledOut) === 1) {
      pulledOutMap.set(String(t.code || '').toUpperCase(), t);
    }
  });

  const history = getSavedWinnersHistory();
  const orderedWinners = [];
  const seenCodes = new Set();

  // 1. Az elmentett húzási sorrend alapján (a korábbiaktól a legújabbak felé)
  history.forEach((hw) => {
    const code = String(hw.code || '').toUpperCase();
    if (pulledOutMap.has(code) && !seenCodes.has(code)) {
      seenCodes.add(code);
      const backendTicket = pulledOutMap.get(code);
      orderedWinners.push({ ...backendTicket, ...hw, isWinner: true, isPulledOut: 1 });
    }
  });

  // 2. Ha van olyan backendről kihúzott jegy, ami még nem volt a history-ban, tegyük a lista elejére
  pulledOutMap.forEach((ticket, code) => {
    if (!seenCodes.has(code)) {
      seenCodes.add(code);
      orderedWinners.unshift({ ...ticket, isWinner: true, isPulledOut: 1 });
    }
  });

  return orderedWinners;
};

/**
 * Sorsolás végrehajtása
 * Szabály: Egy ember (email) legfeljebb 2-szer nyerhet!
 */
export const drawTombolaWinner = async ({ prizeName = '', roundNumber = 1 } = {}) => {
  // Frissítjük a legfrissebb listát
  const allTickets = await fetchTicketsFromBackend();

  // Számoljuk meg, hogy ki hányszor nyert eddig
  const winCountByEmail = new Map();
  allTickets.forEach((t) => {
    if (t.isPulledOut === 1 || t.isWinner) {
      const key = (t.email || t.name || t.code).toLowerCase();
      winCountByEmail.set(key, (winCountByEmail.get(key) || 0) + 1);
    }
  });

  // Érvényes sorsolható jegyek: még nincs kihúzva (isPulledOut === 0) ÉS a tulajdonos < 2 nyereménnyel rendelkezik
  const eligibleTickets = allTickets.filter((t) => {
    if (t.isPulledOut === 1 || t.isWinner) return false;
    const key = (t.email || t.name || t.code).toLowerCase();
    const count = winCountByEmail.get(key) || 0;
    return count < MAX_WINS_PER_RECIPIENT;
  });

  if (eligibleTickets.length === 0) {
    throw new Error('Nincs több sorsolható szelvény a szabályok szerint (minden játékban lévő versenyző elérte a max 2 nyereményt).');
  }

  // Véletlenszerű nyertes sorsolása
  const winnerIndex = Math.floor(Math.random() * eligibleTickets.length);
  const chosenTicket = eligibleTickets[winnerIndex];

  // Backend hívás a PUT /api/Lottery/{code} végpontra
  await pullOutTicket(chosenTicket.code);

  const resultWinner = {
    ...chosenTicket,
    isWinner: true,
    isPulledOut: 1,
    prizeName: prizeName || undefined,
    wonPrize: prizeName || undefined,
    wonRound: roundNumber,
    wonAt: new Date().toISOString()
  };

  // Elmentjük a pontos húzási sorrendet a helyi előzményekbe
  try {
    const history = getSavedWinnersHistory().filter((w) => w.code !== resultWinner.code);
    history.push(resultWinner);
    localStorage.setItem(WINNERS_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn('Nem sikerült elmenteni a sorsolási előzményeket:', err);
  }

  return resultWinner;
};

export const resetWinners = async () => {
  // Megjegyzés: a backend nem törli az adatbázisból, csak helyileg nullázza a tesztekhez
  try {
    const all = getAllTickets();
    const reset = all.map((t) => ({ ...t, isWinner: false, isPulledOut: 0, wonPrize: null }));
    localStorage.setItem(TICKETS_CACHE_KEY, JSON.stringify(reset));
    localStorage.removeItem(WINNERS_KEY);
    window.dispatchEvent(new Event(TOMBOLA_CHANGED_EVENT));
  } catch (e) {
    console.error('Reset error:', e);
  }
};

/**
 * Kérdőív kitöltöttségi állapot
 */
export const hasUserSubmittedSurvey = (email) => {
  try {
    const raw = localStorage.getItem(SURVEY_SUBMISSIONS_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    const normalized = String(email || '').trim().toLowerCase();
    return Array.isArray(list) && list.includes(normalized);
  } catch {
    return false;
  }
};

export const hasCompletedSurvey = (email) => hasUserSubmittedSurvey(email);

/**
 * Kérdőív beküldése és tombola automatikus kiosztása a backend POST /api/Lottery/{email} segítségével
 */
export const submitSurveyAndAward = async ({ email, name, teamName, ratings, feedback }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Az email cím megadása kötelező a kérdőívhez.');
  }

  if (hasUserSubmittedSurvey(normalizedEmail)) {
    throw new Error('Ezzel az email címmel már beküldték a kérdőívet. Egy versenyző egyszer töltheti ki.');
  }

  // Megjelöljük lokálisan, hogy kitöltötte
  try {
    const raw = localStorage.getItem(SURVEY_SUBMISSIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(normalizedEmail)) {
      list.push(normalizedEmail);
      localStorage.setItem(SURVEY_SUBMISSIONS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Hiba a kérdőív státusz mentésekor:', err);
  }

  // Kiadjuk a tombolát a backend segítségével
  const ticket = await awardTicket({
    recipientName: name || 'Versenyző',
    userEmail: normalizedEmail,
    teamName: teamName || '',
    reasonType: 'survey',
    reasonLabel: 'Visszajelző kérdőív kitöltése',
    awardedBy: 'Rendszer'
  });

  return ticket;
};

export const submitSurvey = ({ respondentEmail, respondentName, teamName, answers }) => {
  return submitSurveyAndAward({
    email: respondentEmail,
    name: respondentName,
    teamName,
    feedback: answers
  });
};
