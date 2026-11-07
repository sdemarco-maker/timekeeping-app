import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminApp.css';

interface Employee {
  id: number;
  name: string;
}

interface Case {
  id: number;
  case_number: string;
  total_fee: number;
  status: string;
  created_at: string;
}

interface TimeEntry {
  id: number;
  employee_id: number;
  name: string;
  case_id: number;
  case_number: string;
  start_time: string;
  end_time: string | null;
  hour_type: string;
  duration_hours: number | null;
}

interface PayrollData {
  employee_id: number;
  name: string;
  clinical_hours: number;
  admin_hours: number;
  total_bonus: number;
  total_earnings: number;
}

interface AdminAppProps {
  user: { id: number; name: string };
  onLogout: () => void;
}

const AdminApp: React.FC<AdminAppProps> = ({ user, onLogout }) => {
  const [tab, setTab] = useState<'cases' | 'employees' | 'time-entries' | 'payroll'>('cases');
  const [cases, setCases] = useState<Case[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);

  // Form states
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newCaseFee, setNewCaseFee] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [selectedCaseForAssign, setSelectedCaseForAssign] = useState('');
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] = useState('');
  const [percentageSplit, setPercentageSplit] = useState('');
  const [payrollDate, setPayrollDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAllData();
  }, [tab]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchCases(),
      fetchEmployees(),
      fetchTimeEntries()
    ]);
  };

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/cases`);
      setCases(response.data);
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const response = await axios.get(`${API_URL}/time-entries`);
      setTimeEntries(response.data);
    } catch (err) {
      console.error('Error fetching time entries:', err);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/cases`, {
        case_number: newCaseNumber,
        total_fee: parseFloat(newCaseFee)
      });

      setNewCaseNumber('');
      setNewCaseFee('');
      setSuccess('Case created successfully');
      fetchCases();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creating case');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/employees`, {
        name: newEmployeeName
      });

      setNewEmployeeName('');
      setSuccess('Employee created successfully');
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creating employee');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(
        `${API_URL}/cases/${selectedCaseForAssign}/assign`,
        {
          employee_id: selectedEmployeeForAssign,
          percentage_split: parseFloat(percentageSplit)
        }
      );

      setSelectedCaseForAssign('');
      setSelectedEmployeeForAssign('');
      setPercentageSplit('');
      setSuccess('Employee assigned to case successfully');
      fetchCases();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error assigning employee');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/payroll/generate`, {
        payroll_date: payrollDate
      });

      setPayrollData(response.data);
      setSuccess('Payroll generated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error generating payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCase = async (caseId: number) => {
    setError('');
    setSuccess('');

    try {
      await axios.put(`${API_URL}/cases/${caseId}/close`);
      setSuccess('Case closed successfully');
      fetchCases();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error closing case');
    }
  };

  return (
    <div className="admin-app">
      <div className="app-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>Admin Panel</span>
          <button className="secondary" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="admin-tabs">
          <button
            className={`tab ${tab === 'cases' ? 'active' : ''}`}
            onClick={() => setTab('cases')}
          >
            Cases
          </button>
          <button
            className={`tab ${tab === 'employees' ? 'active' : ''}`}
            onClick={() => setTab('employees')}
          >
            Employees
          </button>
          <button
            className={`tab ${tab === 'time-entries' ? 'active' : ''}`}
            onClick={() => setTab('time-entries')}
          >
            Time Entries
          </button>
          <button
            className={`tab ${tab === 'payroll' ? 'active' : ''}`}
            onClick={() => setTab('payroll')}
          >
            Payroll
          </button>
        </div>

        {/* Cases Tab */}
        {tab === 'cases' && (
          <>
            <div className="card">
              <div className="card-header">
                <h2>Create New Case</h2>
              </div>
              <form onSubmit={handleCreateCase} className="admin-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Case Number</label>
                    <input
                      type="text"
                      value={newCaseNumber}
                      onChange={(e) => setNewCaseNumber(e.target.value)}
                      placeholder="e.g., 100"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCaseFee}
                      onChange={(e) => setNewCaseFee(e.target.value)}
                      placeholder="e.g., 5000"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Case'}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Assign Employee to Case</h2>
              </div>
              <form onSubmit={handleAssignEmployee} className="admin-form">
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label>Select Case</label>
                    <select
                      value={selectedCaseForAssign}
                      onChange={(e) => setSelectedCaseForAssign(e.target.value)}
                      required
                    >
                      <option value="">-- Choose case --</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.case_number} - ${c.total_fee}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Select Employee</label>
                    <select
                      value={selectedEmployeeForAssign}
                      onChange={(e) => setSelectedEmployeeForAssign(e.target.value)}
                      required
                    >
                      <option value="">-- Choose employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Percentage Split (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={percentageSplit}
                      onChange={(e) => setPercentageSplit(e.target.value)}
                      placeholder="e.g., 55"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Assigning...' : 'Assign Employee'}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>All Cases</h2>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id}>
                      <td>{c.case_number}</td>
                      <td>${c.total_fee.toFixed(2)}</td>
                      <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        {c.status === 'active' && (
                          <button onClick={() => handleCloseCase(c.id)} className="danger small">
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Employees Tab */}
        {tab === 'employees' && (
          <>
            <div className="card">
              <div className="card-header">
                <h2>Create New Employee</h2>
              </div>
              <form onSubmit={handleCreateEmployee} className="admin-form">
                <div className="form-group">
                  <label>Employee Name</label>
                  <input
                    type="text"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder="Enter employee name"
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Employee'}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>All Employees</h2>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td>{emp.id}</td>
                      <td>{emp.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Time Entries Tab */}
        {tab === 'time-entries' && (
          <div className="card">
            <div className="card-header">
              <h2>All Time Entries</h2>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Case</th>
                    <th>Type</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map(entry => (
                    <tr key={entry.id}>
                      <td>{entry.name}</td>
                      <td>{entry.case_number}</td>
                      <td>{entry.hour_type}</td>
                      <td>{new Date(entry.start_time).toLocaleString()}</td>
                      <td>{entry.end_time ? new Date(entry.end_time).toLocaleString() : 'Ongoing'}</td>
                      <td>{entry.duration_hours ? entry.duration_hours.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payroll Tab */}
        {tab === 'payroll' && (
          <>
            <div className="card">
              <div className="card-header">
                <h2>Generate Payroll</h2>
              </div>
              <form onSubmit={handleGeneratePayroll} className="admin-form">
                <div className="form-group">
                  <label>Payroll Date (up to)</label>
                  <input
                    type="date"
                    value={payrollDate}
                    onChange={(e) => setPayrollDate(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Payroll Report'}
                </button>
              </form>
            </div>

            {payrollData.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2>Payroll Report</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Clinical Hours</th>
                      <th>Admin Hours</th>
                      <th>Base Pay</th>
                      <th>Bonus</th>
                      <th>Total Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.map(data => {
                      const basePay = (data.clinical_hours * 60) + (data.admin_hours * 25);
                      return (
                        <tr key={data.employee_id}>
                          <td>{data.name}</td>
                          <td>{data.clinical_hours.toFixed(2)}</td>
                          <td>{data.admin_hours.toFixed(2)}</td>
                          <td>${basePay.toFixed(2)}</td>
                          <td>${data.total_bonus.toFixed(2)}</td>
                          <td><strong>${data.total_earnings.toFixed(2)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminApp;
