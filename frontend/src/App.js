import './App.css';
import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import AdminScoringPage from './pages/AdminScoringPage';
import CompetitionRegistration from './pages/CompetitionRegistration';
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
import { auth, authPersistenceReady, googleProvider } from './firebase';
import { isJudgePrivilege } from './config/privilegeConfig';
import { subscribeTeamsToPush } from './services/notificationApi';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPrivilege, setUserPrivilege] = useState(null);
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
        return;
      }

      try {
        const encodedEmail = encodeURIComponent(currentUser.email);
        const [privilegeResult, legacyResult] = await Promise.allSettled([
          fetch(`https://legocompetition.runasp.net/api/Privilege/${encodedEmail}`),
          fetch(`https://legocompetition.runasp.net/api/Teams/privilege/${encodedEmail}`)
        ]);

        let roleValue = 0;
        let isLegacyAdmin = false;

        if (privilegeResult.status === 'fulfilled' && privilegeResult.value.ok) {
          const privilege = await privilegeResult.value.json();
          roleValue = Number(privilege.privilege1) || 0;
        }

        if (legacyResult.status === 'fulfilled' && legacyResult.value.ok) {
          const legacyValue = (await legacyResult.value.text()).trim().replace(/^"|"$/g, '');
          isLegacyAdmin = Number(legacyValue) === 1;
        }

        const effectivePrivilege = isLegacyAdmin ? 1 : roleValue;
        setUserPrivilege(effectivePrivilege);
        setUserRole(effectivePrivilege === 1 ? 'admin' : isJudgePrivilege(effectivePrivilege) ? 'judge' : 'competitor');
      } catch (error) {
        setUserPrivilege(0);
        setUserRole('competitor');
      }
    });

    handleRedirectResult();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.email || userRole !== 'competitor') return undefined;

    const controller = new AbortController();
    const subscribeCurrentCompetitor = async () => {
      try {
        if (window.localStorage.getItem('robotverseny_push_disabled') === 'true') return;
        if ('Notification' in window && Notification.permission === 'denied') return;
        const response = await fetch(
          `https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`,
          { headers: { accept: '*/*' }, signal: controller.signal }
        );
        if (!response.ok) return;
        const teams = await response.json();
        const teamIds = Array.isArray(teams)
          ? [...new Set(teams.map((team) => team.id).filter((id) => id !== null && id !== undefined))]
          : [];
        if (!controller.signal.aborted && teamIds.length > 0) await subscribeTeamsToPush(teamIds);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Az automatikus értesítés-feliratkozás nem sikerült:', error.message);
        }
      }
    };

    subscribeCurrentCompetitor();
    return () => controller.abort();
  }, [user?.email, userRole]);

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

  return (
    <div className="App">
      <Navbar
        user={user}
        userRole={userRole}
        userPrivilege={userPrivilege}
        authLoading={authLoading}
        authError={authError}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />
      <Routes>
        <Route path="*" element={<HomePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/versenyjelentkezes" element={<CompetitionRegistration user={user} />} />
        <Route path="/szabalyzat" element={<RulesPage />} />
        <Route path="/hirek" element={<NewsPage />} />
        <Route path="/hirek/:messageId" element={<NewsDetailsPage />} />
        <Route path="/hirek/cim/:messageTitle" element={<NewsDetailsPage />} />
        <Route path="/allasok" element={<StandingsPage />} />
        <Route path="/csapat/:teamName" element={<TeamDetailsPage />} />
        <Route path="/sajat-csapataim" element={user ? <MyTeamsPage user={user} /> : <LoginPage user={user} authLoading={authLoading} authError={authError} onGoogleSignIn={handleGoogleSignIn} onSignOut={handleSignOut} />} />
        <Route path="/admin" element={userRole === 'admin' ? <AdminPage /> : <HomePage />} />
        <Route path="/admin/jogosultsagok" element={userRole === 'admin' ? <PrivilegeManagementPage /> : <HomePage />} />
        <Route path="/admin/uzenetek" element={userRole === 'admin' ? <MessageManagementPage /> : <HomePage />} />
        <Route path="/admin/ertesitesek" element={userRole === 'admin' ? <NotificationManagementPage /> : <HomePage />} />
        <Route path="/admin/emailek" element={userRole === 'admin' ? <EmailManagementPage /> : <HomePage />} />
        <Route path="/admin/beallitasok" element={userRole === 'admin' || userRole === 'judge' ? <SettingsManagementPage groupOnly={userRole === 'judge'} /> : <HomePage />} />
        <Route path="/admin/pontozas" element={userRole === 'admin' || userRole === 'judge' ? <AdminScoringPage userPrivilege={userPrivilege} /> : <HomePage />} />
        <Route path="/admin/pontozas/:competitionType" element={userRole === 'admin' || userRole === 'judge' ? <AdminScoringPage userPrivilege={userPrivilege} /> : <HomePage />} />
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
      </Routes>
      <footer className="container py-4 mt-4 border-top text-center text-muted small">
        A LEGO® a LEGO Group védjegye. Ez egy független rendezvény és weboldal, amely nem áll kapcsolatban a LEGO Grouppal, és amelyet a LEGO Group nem szponzorál.
      </footer>
    </div>
  );
}

export default App;
