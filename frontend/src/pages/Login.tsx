import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

interface LoginProps {
  onLogin: (user: { id: number; name: string; isAdmin?: boolean }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginType, setLoginType] = useState<'employee' | 'admin'>('employee');
  const [employeeName, setEmployeeName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.get(`${API_URL}/employees/${employeeName}`);
      onLogin({
        id: response.data.id,
        name: response.data.name,
        isAdmin: false
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please check your name.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const correctPassword = process.env.REACT_APP_ADMIN_PASSWORD || 'admin123';
    if (adminPassword === correctPassword) {
      onLogin({
        id: 0,
        name: 'Admin',
        isAdmin: true
      });
    } else {
      setError('Incorrect admin password.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Timekeeping App</h1>
        <p className="subtitle">Track your time and case hours</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="login-tabs">
          <button
            className={`tab-button ${loginType === 'employee' ? 'active' : ''}`}
            onClick={() => setLoginType('employee')}
          >
            Employee
          </button>
          <button
            className={`tab-button ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginType('admin')}
          >
            Admin
          </button>
        </div>

        {loginType === 'employee' ? (
          <form onSubmit={handleEmployeeLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="employeeName">Your Name</label>
              <input
                id="employeeName"
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="adminPassword">Admin Password</label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>
            <button type="submit">Login as Admin</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
