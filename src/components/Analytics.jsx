import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfDay, endOfDay, subDays, isToday, parseISO } from 'date-fns';

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days'); // 7days, 30days, 90days
  
  // Analytics Data
  const [totalQueues, setTotalQueues] = useState(0);
  const [activeQueues, setActiveQueues] = useState(0);
  const [completedQueues, setCompletedQueues] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState(0);
  
  // Chart Data
  const [dailyQueueData, setDailyQueueData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [hospitalData, setHospitalData] = useState([]);
  const [waitTimeData, setWaitTimeData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  
  const [realTimeStats, setRealTimeStats] = useState({
    currentPatients: 0,
    avgProcessingTime: 0,
    peakHours: [],
    efficiency: 0
  });

  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    loadAnalyticsData();
    setupRealTimeListeners();
  }, [timeRange, navigate]);

  const setupRealTimeListeners = () => {
    // Real-time listener for queue updates
    const queueQuery = query(collection(db, 'queues'));
    
    const unsubscribe = onSnapshot(queueQuery, (snapshot) => {
      const queues = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      updateRealTimeStats(queues);
    });

    return () => unsubscribe();
  };

  const updateRealTimeStats = (queues) => {
    const active = queues.filter(q => q.status === 'waiting').length;
    const completed = queues.filter(q => q.status === 'completed').length;
    
    // Calculate average processing time for completed queues
    const completedToday = queues.filter(q => 
      q.status === 'completed' && 
      q.completedAt && 
      isToday(new Date(q.completedAt))
    );
    
    const avgProcessing = completedToday.length > 0 
      ? completedToday.reduce((sum, q) => {
          if (q.actualWaitTime) return sum + q.actualWaitTime;
          return sum + (q.estimatedWaitTime || 10);
        }, 0) / completedToday.length
      : 0;

    // Calculate efficiency (completed vs total)
    const efficiency = queues.length > 0 ? (completed / queues.length) * 100 : 0;

    setRealTimeStats({
      currentPatients: active,
      avgProcessingTime: Math.round(avgProcessing),
      efficiency: Math.round(efficiency),
      peakHours: calculatePeakHours(queues)
    });
  };

  const calculatePeakHours = (queues) => {
    const hourCounts = {};
    
    queues.forEach(queue => {
      if (queue.timestamp) {
        const hour = new Date(queue.timestamp.seconds * 1000).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }));
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
      const startDate = subDays(new Date(), days);
      
      // Get all queues in time range
      const queueQuery = query(
        collection(db, 'queues'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(queueQuery);
      const allQueues = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp ? new Date(doc.data().timestamp.seconds * 1000) : new Date()
      })).filter(queue => queue.date >= startDate);

      // Calculate basic stats
      const total = allQueues.length;
      const active = allQueues.filter(q => q.status === 'waiting').length;
      const completed = allQueues.filter(q => q.status === 'completed').length;
      const avgWait = allQueues.length > 0 
        ? allQueues.reduce((sum, q) => sum + (q.estimatedWaitTime || 10), 0) / allQueues.length 
        : 0;

      setTotalQueues(total);
      setActiveQueues(active);
      setCompletedQueues(completed);
      setAvgWaitTime(Math.round(avgWait));

      // Generate daily data
      generateDailyData(allQueues, days);
      generateDepartmentData(allQueues);
      generateHospitalData(allQueues);
      generateWaitTimeData(allQueues);
      generateHourlyData(allQueues);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyData = (queues, days) => {
    const dailyData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayQueues = queues.filter(q => 
        q.date.toDateString() === date.toDateString()
      );
      
      dailyData.push({
        date: format(date, 'MMM dd'),
        total: dayQueues.length,
        completed: dayQueues.filter(q => q.status === 'completed').length,
        waiting: dayQueues.filter(q => q.status === 'waiting').length,
        avgWait: dayQueues.length > 0 
          ? dayQueues.reduce((sum, q) => sum + (q.estimatedWaitTime || 10), 0) / dayQueues.length 
          : 0
      });
    }
    
    setDailyQueueData(dailyData);
  };

  const generateDepartmentData = (queues) => {
    const deptCounts = {};
    queues.forEach(q => {
      if (q.department) {
        deptCounts[q.department] = (deptCounts[q.department] || 0) + 1;
      }
    });
    
    const deptData = Object.entries(deptCounts).map(([dept, count]) => ({
      name: dept,
      value: count,
      percentage: ((count / queues.length) * 100).toFixed(1)
    }));
    
    setDepartmentData(deptData);
  };

  const generateHospitalData = (queues) => {
    const hospitalCounts = {};
    queues.forEach(q => {
      if (q.hospital) {
        hospitalCounts[q.hospital] = (hospitalCounts[q.hospital] || 0) + 1;
      }
    });
    
    const hospitalData = Object.entries(hospitalCounts).map(([hospital, count]) => ({
      hospital,
      patients: count,
      completed: queues.filter(q => q.hospital === hospital && q.status === 'completed').length,
      waiting: queues.filter(q => q.hospital === hospital && q.status === 'waiting').length
    }));
    
    setHospitalData(hospitalData);
  };

  const generateWaitTimeData = (queues) => {
    const waitRanges = {
      '0-15 min': 0,
      '15-30 min': 0,
      '30-60 min': 0,
      '60+ min': 0
    };
    
    queues.forEach(q => {
      const waitTime = q.estimatedWaitTime || 10;
      if (waitTime <= 15) waitRanges['0-15 min']++;
      else if (waitTime <= 30) waitRanges['15-30 min']++;
      else if (waitTime <= 60) waitRanges['30-60 min']++;
      else waitRanges['60+ min']++;
    });
    
    const waitData = Object.entries(waitRanges).map(([range, count]) => ({
      range,
      count,
      percentage: queues.length > 0 ? ((count / queues.length) * 100).toFixed(1) : 0
    }));
    
    setWaitTimeData(waitData);
  };

  const generateHourlyData = (queues) => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      patients: 0,
      avgWait: 0
    }));
    
    queues.forEach(q => {
      if (q.date) {
        const hour = q.date.getHours();
        hourlyData[hour].patients++;
        hourlyData[hour].avgWait += q.estimatedWaitTime || 10;
      }
    });
    
    hourlyData.forEach(data => {
      if (data.patients > 0) {
        data.avgWait = Math.round(data.avgWait / data.patients);
      }
    });
    
    setHourlyData(hourlyData.filter(d => d.patients > 0));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const exportData = () => {
    const data = {
      summary: { totalQueues, activeQueues, completedQueues, avgWaitTime },
      dailyData: dailyQueueData,
      departmentData,
      hospitalData,
      waitTimeData,
      realTimeStats,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading Analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="18" y="8" width="4" height="24" fill="#2563eb"/>
                <rect x="8" y="18" width="24" height="4" fill="#2563eb"/>
                <circle cx="20" cy="20" r="18" stroke="#2563eb" strokeWidth="2"/>
              </svg>
            </div>
            <h1 className="hospital-name">MediCare Analytics</h1>
          </div>
          <div className="header-actions">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-range-select"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <button onClick={exportData} className="export-button">
              Export Data
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="analytics-main">
        {/* Real-time Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Queues</h3>
              <div className="stat-number">{totalQueues}</div>
              <p className="stat-change">In selected period</p>
            </div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Completed</h3>
              <div className="stat-number">{completedQueues}</div>
              <p className="stat-change">
                {totalQueues > 0 ? `${((completedQueues/totalQueues)*100).toFixed(1)}%` : '0%'} completion rate
              </p>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>Currently Waiting</h3>
              <div className="stat-number">{realTimeStats.currentPatients}</div>
              <p className="stat-change">Real-time count</p>
            </div>
          </div>
          
          <div className="stat-card info">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <h3>Avg Wait Time</h3>
              <div className="stat-number">{avgWaitTime}m</div>
              <p className="stat-change">Current average</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Daily Queue Trends */}
          <div className="chart-card large">
            <h3>Daily Queue Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyQueueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
                <Area type="monotone" dataKey="completed" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="waiting" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Department Distribution */}
          <div className="chart-card">
            <h3>Department Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Hospital Performance */}
          <div className="chart-card">
            <h3>Hospital Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hospitalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hospital" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#10b981" />
                <Bar dataKey="waiting" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wait Time Distribution */}
          <div className="chart-card">
            <h3>Wait Time Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={waitTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Patterns */}
          <div className="chart-card large">
            <h3>Hourly Patient Patterns</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="patients" fill="#2563eb" />
                <Line yAxisId="right" type="monotone" dataKey="avgWait" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Insights */}
        <div className="insights-section">
          <h3>Real-time Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>🔥 Peak Hours</h4>
              <div className="peak-hours">
                {realTimeStats.peakHours.map((peak, index) => (
                  <div key={index} className="peak-hour">
                    <span className="hour">{peak.hour}</span>
                    <span className="count">{peak.count} patients</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="insight-card">
              <h4>⚡ System Efficiency</h4>
              <div className="efficiency-meter">
                <div 
                  className="efficiency-bar" 
                  style={{ width: `${realTimeStats.efficiency}%` }}
                ></div>
                <span className="efficiency-text">{realTimeStats.efficiency}%</span>
              </div>
            </div>
            
            <div className="insight-card">
              <h4>📈 Recommendations</h4>
              <ul className="recommendations">
                {realTimeStats.currentPatients > 20 && (
                  <li>High patient load detected - consider adding more staff</li>
                )}
                {avgWaitTime > 30 && (
                  <li>Average wait time is high - optimize queue processing</li>
                )}
                {realTimeStats.efficiency < 70 && (
                  <li>Efficiency below target - review workflow processes</li>
                )}
                {realTimeStats.peakHours.length > 0 && (
                  <li>Peak hours identified - plan staffing accordingly</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;