import './App.css';
import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import CompetitionRegistration from './pages/CompetitionRegistration';
import RulesPage from './pages/RulesPage';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import { auth, googleProvider } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
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
        authLoading={authLoading}
        authError={authError}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />
      <Routes>
        <Route path="*" element={<HomePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/versenyjelentkezes" element={<CompetitionRegistration />} />
        <Route path="/szabalyzat" element={<RulesPage />} />
        <Route path="/admin" element={<AdminPage />} />
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
