import './App.css';
import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ShowPage from './pages/ShowPage';
import AdminPage from './pages/AdminPage';
import AdminScoringPage from './pages/AdminScoringPage';
import GameScoringPage from './pages/GameScoringPage';
import CompetitionRegistration from './pages/CompetitionRegistration';
import JudgeRegistration from './pages/JudgeRegistration';
import RulesPage from './pages/RulesPage';
import StandingsPage from './pages/StandingsPage';
import TeamDetailsPage from './pages/TeamDetailsPage';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import PrivilegeManagementPage from './pages/PrivilegeManagementPage';
import MyTeamsPage from './pages/MyTeamsPage';
import MessageManagementPage from './pages/MessageManagementPage';
import SettingsManagementPage from './pages/SettingsManagementPage';
import NewsPage from './pages/NewsPage';
import NewsDetailsPage from './pages/NewsDetailsPage';
import NotificationManagementPage from './pages/NotificationManagementPage';
import EmailManagementPage from './pages/EmailManagementPage';
import JudgeApplicationsPage from './pages/JudgeApplicationsPage';
import UserMessagesPage from './pages/UserMessagesPage';
import NotificationPromptBanner from './components/NotificationPromptBanner';
import AutoBackupRunner from './components/AutoBackupRunner';
import { auth, authPersistenceReady, googleProvider } from './firebase';
import { isJudgePrivilege } from './config/privilegeConfig';
import { subscribeTeamsToPush } from './services/notificationApi';
import FloatingRefreshButton from './components/FloatingRefreshButton';
import AutomaticPhaseAdvancer from './components/AutomaticPhaseAdvancer';
import TopThrees from './pages/TopThrees';

function App() {
  const location = useLocation();
  const isShowPage = location.pathname === '/show';
  const isGameScoringPage = location.pathname.startsWith('/admin/pontozas-jatek');
  const isFocusPage = isShowPage || isGameScoringPage;
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPrivilege, setUserPrivilege] = useState(null);
  const [userTeamId, setUserTeamId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        await authPersistenceReady;
        await getRedirectResult(auth);
      } catch (error) {
        setAuthError(`Sikertelen bejelentkezés: ${error.message}`);
      } finally {
        // Mobilböngészőben a redirect eredménye sikertelenül is visszatérhet.
        // Ilyenkor se maradjon végtelen ideig letiltva a belépés gombja.
        setAuthLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser?.email) {
        setUserRole(null);
        setUserPrivilege(null);
        setUserTeamId(null);
        return;
      }

      try {
        const encodedEmail = encodeURIComponent(currentUser.email);
        const [privilegeResult, legacyResult] = await Promise.allSettled([
          fetch(`https://legocompetition.runasp.net/api/Privilege/${encodedEmail}`),
          fetch(`https://legocompetition.runasp.net/api/Teams/privilege/${encodedEmail}`)
        ]);

        let roleValue = 0;
        let teamIdValue = null;
        let isLegacyAdmin = false;

        // Try to fetch the new Privilege API
        if (privilegeResult.status === 'fulfilled' && privilegeResult.value.ok) {
          try {
            const privilege = await privilegeResult.value.json();
            roleValue = Number(privilege.privilege1) || 0;
            teamIdValue = privilege.teamId || null;
          } catch (e) {
            console.warn('Error parsing Privilege response:', e);
          }
        }

        // Fallback to legacy API if new API didn't work
        if (legacyResult.status === 'fulfilled' && legacyResult.value.ok) {
          const legacyValue = (await legacyResult.value.text()).trim().replace(/^"|"$/g, '');
          isLegacyAdmin = Number(legacyValue) === 1;
        }

        const effectivePrivilege = isLegacyAdmin ? 1 : roleValue;
        setUserPrivilege(effectivePrivilege);
        setUserTeamId(teamIdValue);
        setUserRole(effectivePrivilege === 1 ? 'admin' : isJudgePrivilege(effectivePrivilege) ? 'judge' : 'competitor');
      } catch (error) {
        console.warn('Error fetching privilege:', error);
        setUserPrivilege(0);
        setUserTeamId(null);
        setUserRole('competitor');
      }
    });

    handleRedirectResult();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.email) return undefined;

    const controller = new AbortController();
    const subscribeCurrentUser = async () => {
      try {
        if (window.localStorage.getItem('robotverseny_push_disabled') === 'true') return;
        if ('Notification' in window && Notification.permission !== 'granted') return;
        let teamIds = [];
        try {
          const response = await fetch(
            `https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`,
            { headers: { accept: '*/*' }, signal: controller.signal }
          );
          if (response.ok) {
            const teams = await response.json();
            teamIds = Array.isArray(teams)
              ? [...new Set(teams
                .filter((team) => team && typeof team === 'object')
                .map((team) => team.id)
                .filter((id) => id !== null && id !== undefined))]
              : [];
          }
        } catch {
          // ignore
        }
        if (!controller.signal.aborted) {
          await subscribeTeamsToPush(teamIds, user.email);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Az automatikus értesítés-feliratkozás nem sikerült:', error.message);
        }
      }
    };

    subscribeCurrentUser();
    return () => controller.abort();
  }, [user?.email]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);

    try {
      await authPersistenceReady;
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (popupError) {
        if (popupError?.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, googleProvider);
          // Néhány mobilböngésző a navigáció elindítása nélkül oldja fel
          // a redirect ígéretét. Ebben az esetben újra használható a gomb.
          setAuthLoading(false);
          return;
        }

        throw popupError;
      }
      setAuthLoading(false);
    } catch (error) {
      setAuthLoading(false);
      setAuthError(`Sikertelen bejelentkezés: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    setAuthError('');

    try {
      await signOut(auth);
    } catch (error) {
      setAuthError(`Sikertelen kijelentkezés: ${error.message}`);
    }
  };

  const canScore = userRole === 'admin' || userRole === 'judge';
  const protectedAdminPage = (element) => (
    authLoading ? <main className="container py-5"><div className="alert alert-info">Jogosultság ellenőrzése...</div></main> : element
  );

  return (
    <div className="App">
      <AutomaticPhaseAdvancer enabled={userRole === 'admin'} />
      <AutoBackupRunner enabled={userRole === 'admin'} />
      {!isFocusPage && (
        <>
          <Navbar
            user={user}
            userRole={userRole}
            userPrivilege={userPrivilege}
            userTeamId={userTeamId}
            authLoading={authLoading}
            authError={authError}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
          />
          <NotificationPromptBanner user={user} />
        </>
      )}
      <Routes>
        <Route path="*" element={<HomePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/rolunk" element={<AboutPage />} />
        <Route path="/show" element={<ShowPage />} />
        <Route path="/versenyjelentkezes" element={<CompetitionRegistration user={user} />} />
        <Route path="/birojelentkezes" element={<JudgeRegistration />} />
        <Route path="/biro-jelentkezes" element={<JudgeRegistration />} />
        <Route path="/szabalyzat" element={<RulesPage />} />
        <Route path="/hirek" element={<NewsPage />} />
        <Route path="/hirek/:messageId" element={<NewsDetailsPage userRole={userRole} />} />
        <Route path="/hirek/cim/:messageTitle" element={<NewsDetailsPage userRole={userRole} />} />
        <Route path="/uzenetek" element={<UserMessagesPage user={user} userTeamId={userTeamId} />} />
        <Route path="/ertesiteseim" element={<UserMessagesPage user={user} userTeamId={userTeamId} />} />
        <Route path="/allasok" element={<StandingsPage />} />
        <Route path="/csapat/:teamName" element={<TeamDetailsPage userRole={userRole} userPrivilege={userPrivilege} />} />
        <Route path="/sajat-csapataim" element={user ? <MyTeamsPage user={user} /> : <LoginPage user={user} authLoading={authLoading} authError={authError} onGoogleSignIn={handleGoogleSignIn} onSignOut={handleSignOut} />} />
        <Route path="/admin" element={protectedAdminPage(userRole === 'admin' ? <AdminPage /> : <HomePage />)} />
        <Route path="/admin/biro-jelentkezesek" element={protectedAdminPage(userRole === 'admin' ? <JudgeApplicationsPage /> : <HomePage />)} />
        <Route path="/admin/jogosultsagok" element={protectedAdminPage(userRole === 'admin' ? <PrivilegeManagementPage /> : <HomePage />)} />
        <Route path="/admin/uzenetek" element={protectedAdminPage(userRole === 'admin' ? <MessageManagementPage /> : <HomePage />)} />
        <Route path="/admin/ertesitesek" element={protectedAdminPage(userRole === 'admin' ? <NotificationManagementPage /> : <HomePage />)} />
        <Route path="/admin/emailek" element={protectedAdminPage(userRole === 'admin' ? <EmailManagementPage /> : <HomePage />)} />
        <Route path="/admin/beallitasok" element={protectedAdminPage(canScore ? <SettingsManagementPage groupOnly={userRole === 'judge'} /> : <HomePage />)} />
        <Route path="/admin/pontozas" element={protectedAdminPage(canScore ? <AdminScoringPage userPrivilege={userPrivilege} /> : <HomePage />)} />
        <Route path="/admin/pontozas/:competitionType" element={protectedAdminPage(canScore ? <AdminScoringPage userPrivilege={userPrivilege} /> : <HomePage />)} />
        <Route path="/admin/pontozas-jatek" element={protectedAdminPage(canScore ? <GameScoringPage userPrivilege={userPrivilege} /> : <HomePage />)} />
        <Route path="/admin/pontozas-jatek/:competitionType" element={protectedAdminPage(canScore ? <GameScoringPage userPrivilege={userPrivilege} /> : <HomePage />)} />
        <Route
          path="/bejelentkezes"
          element={
            <LoginPage
              user={user}
              authLoading={authLoading}
              authError={authError}
              onGoogleSignIn={handleGoogleSignIn}
              onSignOut={handleSignOut}
            />
          }
        />
        <Route path="/admin/eredmenyhirdetes" element={protectedAdminPage(userRole === 'admin' ? <TopThrees userPrivilege={userPrivilege} /> : <HomePage />)} />
      </Routes>
      {!isShowPage && <FloatingRefreshButton />}
      {!isFocusPage && <footer className="container py-4 mt-4 border-top text-center text-muted small">
        A LEGO® a LEGO Group védjegye. Ez egy független rendezvény és weboldal, amely nem áll kapcsolatban a LEGO Grouppal, és amelyet a LEGO Group nem szponzorál.
      </footer>}
    </div>
  );
}

export default App;
