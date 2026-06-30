import './App.css';
import { useEffect, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import CompetitionRegistration from './pages/CompetitionRegistration';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import { auth, googleProvider } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const hasInitialAuthStateRef = useRef(false);
  const previousUserRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (!hasInitialAuthStateRef.current) {
        hasInitialAuthStateRef.current = true;
        previousUserRef.current = currentUser;
        return;
      }

      if (currentUser && !previousUserRef.current) {
        setSuccessMessage('Sikeres bejelentkezés!');
        const timer = window.setTimeout(() => setSuccessMessage(''), 2400);
        return () => window.clearTimeout(timer);
      }

      previousUserRef.current = currentUser;
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
      {successMessage && (
        <div className="auth-success-toast" role="status" aria-live="polite">
          {successMessage}
        </div>
      )}
      <Routes>
        <Route path="*" element={<HomePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/versenyjelentkezes" element={<CompetitionRegistration />} />
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
