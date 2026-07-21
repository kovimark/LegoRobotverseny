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
import { auth, googleProvider } from './firebase';
import { isJudgePrivilege } from './config/privilegeConfig';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPrivilege, setUserPrivilege] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error) {
        setAuthError(`Sikertelen bejelentkezés: ${error.message}`);
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

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);

    try {
      const isLikelyMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

      if (isLikelyMobile) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      try {
        await signInWithPopup(auth, googleProvider);
      } catch (popupError) {
        if (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/popup-closed-by-user' || popupError?.message?.includes('popup')) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }

        throw popupError;
      }
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
        <Route path="/allasok" element={<StandingsPage />} />
        <Route path="/csapat/:teamName" element={<TeamDetailsPage />} />
        <Route path="/sajat-csapataim" element={user ? <MyTeamsPage user={user} /> : <LoginPage user={user} authLoading={authLoading} authError={authError} onGoogleSignIn={handleGoogleSignIn} onSignOut={handleSignOut} />} />
        <Route path="/admin" element={userRole === 'admin' ? <AdminPage /> : <HomePage />} />
        <Route path="/admin/jogosultsagok" element={userRole === 'admin' ? <PrivilegeManagementPage /> : <HomePage />} />
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
