import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmployeeApp.css';

interface TimeEntry {
  id: number;
  case_id: number;
  case_number: string;
  start_time: string;
  end_time: string | null;
  hour_type: string;
  duration_hours: number | null;
}

interface Case {
  id: number;
  case_number: string;
  total_fee: number;
  percentage_split: number;
}

interface CaseSummary {
  id: number;
  case_number: string;
  total_fee: number;
  percentage_split: number;
  clinical_hours: number;
  admin_hours: number;
}

interface EmployeeAppProps {
  user: { id: number; name: string };
  onLogout: () => void;
}

const EmployeeApp: React.FC<EmployeeAppProps> = ({ user, onLogout }) => {
  const [activeClock, setActiveClock] = useState<TimeEntry | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [caseSummaries, setCaseSummaries] = useState<CaseSummary[]>([]);
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [hourType, setHourType] = useState<'clinical' | 'admin'>('clinical');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'track' | 'summary'>('track');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load cases on mount
  useEffect(() => {
    fetchCases();
    fetchCaseSummaries();
    checkActiveClock();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/cases/employee/${user.id}`);
      setCases(response.data);
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  };

  const fetchCaseSummaries = async () => {
    try {
      const response = await axios.get(`${API_URL}/time-entries/case-summary/${user.id}`);
      setCaseSummaries(response.data);
    } catch (err) {
      console.error('Error fetching case summaries:', err);
    }
  };

  const checkActiveClock = async () => {
    try {
      const response = await axios.get(`${API_URL}/time-entries/employee/${user.id}`);
      const active = response.data.find((e: TimeEntry) => !e.end_time);
      if (active) {
        setActiveClock(active);
        setSelectedCase(active.case_id);
      }
    } catch (err) {
      console.error('Error checking active clock:', err);
    }
  };

  const handleClockIn = async () => {
    if (!selectedCase) {
      setError('Please select a case');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/time-entries/clock-in`, {
        employee_id: user.id,
        case_id: selectedCase,
        hour_type: hourType
      });

      setActiveClock(response.data);
      setSuccess('Clocked in successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error clocking in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_URL}/time-entries/clock-out`, {
        employee_id: user.id
      });

      setActiveClock(null);
      setSuccess('Clocked out successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchCaseSummaries();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error clocking out');
    } finally {
      setLoading(false);
    }
  };

  const calculateEarnings = (summary: CaseSummary) => {
    const employeeEarnings = (summary.total_fee * summary.percentage_split) / 100;
    const basePay = (summary.clinical_hours * 60) + (summary.admin_hours * 25);
    const bonus = Math.max(0, employeeEarnings - basePay);
    return {
      employeeEarnings,
      basePay,
      bonus,
      total: employeeEarnings
    };
  };

  const totalStats = caseSummaries.reduce((acc, summary) => {
    const earnings = calculateEarnings(summary);
    return {
      clinicalHours: acc.clinicalHours + (summary.clinical_hours || 0),
      adminHours: acc.adminHours + (summary.admin_hours || 0),
      totalBonus: acc.totalBonus + earnings.bonus,
      totalEarnings: acc.totalEarnings + earnings.total
    };
  }, { clinicalHours: 0, adminHours: 0, totalBonus: 0, totalEarnings: 0 });

  return (
    <div className="employee-app">
      <div className="app-header">
        <h1>Timekeeping Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user.name}!</span>
          <button className="secondary" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Clock In/Out Card */}
        <div className="card clock-card">
          <div className="card-header">
            <h2>Time Clock</h2>
            {activeClock && <span className="clock-status">🔴 CLOCKED IN</span>}
          </div>

          {!activeClock ? (
            <div className="clock-in-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Select Case</label>
                  <select
                    value={selectedCase || ''}
                    onChange={(e) => setSelectedCase(Number(e.target.value))}
                  >
                    <option value="">-- Choose a case --</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.case_number} - ${c.total_fee} ({c.percentage_split}% yours)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Hour Type</label>
                  <select
                    value={hourType}
                    onChange={(e) => setHourType(e.target.value as 'clinical' | 'admin')}
                  >
                    <option value="clinical">Clinical ($60/hr)</option>
                    <option value="admin">Administrative ($25/hr)</option>
                  </select>
                </div>
              </div>

              <button onClick={handleClockIn} disabled={loading} className="primary">
                {loading ? 'Clocking in...' : 'Clock In'}
              </button>
            </div>
          ) : (
            <div className="clock-out-section">
              <div className="active-session">
                <p><strong>Case:</strong> {cases.find(c => c.id === activeClock.case_id)?.case_number}</p>
                <p><strong>Type:</strong> {activeClock.hour_type === 'clinical' ? 'Clinical ($60/hr)' : 'Administrative ($25/hr)'}</p>
                <p><strong>Started:</strong> {new Date(activeClock.start_time).toLocaleTimeString()}</p>
                <p><strong>Time Elapsed:</strong> {formatDuration(activeClock.start_time)}</p>
              </div>
              <button onClick={handleClockOut} disabled={loading} className="danger">
                {loading ? 'Clocking out...' : 'Clock Out'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${tab === 'track' ? 'active' : ''}`}
            onClick={() => setTab('track')}
          >
            Time Tracking
          </button>
          <button
            className={`tab ${tab === 'summary' ? 'active' : ''}`}
            onClick={() => setTab('summary')}
          >
            Case Summary & Earnings
          </button>
        </div>

        {/* Time Tracking Tab */}
        {tab === 'track' && (
          <div className="card">
            <div className="card-header">
              <h2>Recent Time Entries</h2>
            </div>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">Clinical Hours</span>
                <span className="stat-value">{totalStats.clinicalHours.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Admin Hours</span>
                <span className="stat-value">{totalStats.adminHours.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Earnings</span>
                <span className="stat-value">${totalStats.totalEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Case Summary Tab */}
        {tab === 'summary' && (
          <div className="card">
            <div className="card-header">
              <h2>Case Summary & Earnings</h2>
            </div>

            {caseSummaries.length === 0 ? (
              <p>No cases assigned yet.</p>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Case #</th>
                      <th>Case Fee</th>
                      <th>Your %</th>
                      <th>Your Share</th>
                      <th>Clinical Hrs</th>
                      <th>Admin Hrs</th>
                      <th>Base Pay</th>
                      <th>Bonus</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseSummaries.map(summary => {
                      const earnings = calculateEarnings(summary);
                      return (
                        <tr key={summary.id}>
                          <td>{summary.case_number}</td>
                          <td>${summary.total_fee.toFixed(2)}</td>
                          <td>{summary.percentage_split}%</td>
                          <td>${earnings.employeeEarnings.toFixed(2)}</td>
                          <td>{(summary.clinical_hours || 0).toFixed(2)}</td>
                          <td>{(summary.admin_hours || 0).toFixed(2)}</td>
                          <td>${earnings.basePay.toFixed(2)}</td>
                          <td>${earnings.bonus.toFixed(2)}</td>
                          <td><strong>${earnings.total.toFixed(2)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="summary-totals">
                  <p><strong>Total Clinical Hours:</strong> {totalStats.clinicalHours.toFixed(2)}</p>
                  <p><strong>Total Admin Hours:</strong> {totalStats.adminHours.toFixed(2)}</p>
                  <p><strong>Total Bonus:</strong> ${totalStats.totalBonus.toFixed(2)}</p>
                  <p className="grand-total"><strong>Grand Total Earnings:</strong> ${totalStats.totalEarnings.toFixed(2)}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function formatDuration(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - start) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

export default EmployeeApp;
