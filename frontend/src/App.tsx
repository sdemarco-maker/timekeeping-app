import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './pages/Login';
import EmployeeApp from './pages/EmployeeApp';
import AdminApp from './pages/AdminApp';

interface CurrentUser {
  id: number;
  name: string;
  isAdmin?: boolean;
}

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [adminPassword] = useState(process.env.REACT_APP_ADMIN_PASSWORD || 'admin123');

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <div className="App">
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : currentUser.isAdmin ? (
        <AdminApp user={currentUser} onLogout={handleLogout} />
      ) : (
        <EmployeeApp user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
