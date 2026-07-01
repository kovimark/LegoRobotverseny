import './App.css';
import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import AdminScoringPage from './pages/AdminScoringPage';
import CompetitionRegistration from './pages/CompetitionRegistration';
import RulesPage from './pages/RulesPage';
import StandingsPage from './pages/StandingsPage';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import { auth, googleProvider } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser?.email) {
        setUserRole(null);
        return;
      }

      try {
        const response = await fetch(`https://legocompetition.runasp.net/api/Teams/privilege/${encodeURIComponent(currentUser.email)}`);
        if (!response.ok) {
          throw new Error('Privilege lookup failed');
        }

        const roleValue = await response.text();
        setUserRole(roleValue === '1' ? 'admin' : 'competitor');
      } catch (error) {
        setUserRole('competitor');
      }
    });

    return unsubscribe;
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError('');

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
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
        <Route path="/admin" element={userRole === 'admin' ? <AdminPage /> : <HomePage />} />
        <Route path="/admin/pontozas" element={userRole === 'admin' ? <AdminScoringPage /> : <HomePage />} />
        <Route path="/admin/pontozas/:competitionType" element={userRole === 'admin' ? <AdminScoringPage /> : <HomePage />} />
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
    </div>
  );
}

export default App;
