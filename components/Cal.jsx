// components/Cal.jsx
import React, { useState, useEffect } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

const Cal = () => {
  const [status, setStatus] = useState('idle');
  const [calendarData, setCalendarData] = useState([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('week');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'trend'
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // Format: YYYY-MM

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const response = await fetch(`/api/caldav?range=${dateRange}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch calendar data');
        }
        setCalendarData(data);
        setStatus('success');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    fetchData();
  }, [dateRange]);

  useEffect(() => {
    // Only fetch monthly trend data if in trend view mode
    if (viewMode === 'trend') {
      const fetchMonthlyTrend = async () => {
        setStatus('loading');
        try {
          const response = await fetch(`/api/caldav/monthly?month=${currentMonth}`);
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch monthly trend data');
          }
          setMonthlyTrendData(data);
          setStatus('success');
        } catch (err) {
          setError(err.message);
          setStatus('error');
        }
      };

      fetchMonthlyTrend();
    }
  }, [viewMode, currentMonth]);

  // Navigate between months
  const changeMonth = (offset) => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + offset);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  // Format month for display
  const formatMonth = (monthStr) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Sort the data for pie chart
  const sortedData = [...calendarData].sort((a, b) => b.hours - a.hours);
  const totalHours = sortedData.reduce((sum, cal) => sum + cal.hours, 0);

  const pieData = {
    labels: sortedData.map(item => {
      const percentage = totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0;
      return `${item.name} (+${item.hours})`;
    }),
    datasets: [
      {
        data: sortedData.map(item => item.hours),
        backgroundColor: sortedData.map(item => item.color),
      },
    ],
  };

  // Prepare monthly trend chart data
  const prepareTrendData = () => {
    if (!monthlyTrendData || !monthlyTrendData.weeks || !monthlyTrendData.categories) {
      return null;
    }

    const labels = monthlyTrendData.weeks.map(week => `Week ${week.weekNumber}`);
    
    const datasets = Object.entries(monthlyTrendData.categories).map(([category, color]) => {
      return {
        label: category,
        data: monthlyTrendData.weeks.map(week => week.categories[category] || 0),
        borderColor: color,
        backgroundColor: color + '33', // Add transparency
        tension: 0.3,
      };
    });

    return { labels, datasets };
  };

  const trendData = prepareTrendData();

  // Chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15,
          font: { size: 14 },
          padding: 20
        },
        display: true // Ensure legend is displayed
      },
      title: {
        display: true,
        text: 'Time Distribution',
        font: { size: 20, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const percentage = totalHours > 0 ? Math.round((context.raw / totalHours) * 100) : 0;
            return `${context.raw} hours (${percentage}%)`;
          }
        }
      },
      datalabels: {
        formatter: (value, ctx) => {
          const percentage = totalHours > 0 ? Math.round((value / totalHours) * 100) : 0;
          return percentage >= 3 ? `${percentage}%` : ''; // Only show if slice is large enough
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14
        },
        anchor: 'center',
        align: 'center'
      }
    },
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Disable datalabels for line chart
      },
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: `Weekly Hours by Category - ${formatMonth(currentMonth)}`,
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw.toFixed(1)} hours`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours'
        }
      }
    }
  };

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              viewMode === 'summary'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Summary View
          </button>
          <button
            onClick={() => setViewMode('trend')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              viewMode === 'trend'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Monthly Trends
          </button>
        </div>
        
        {viewMode === 'summary' ? (
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1 text-sm rounded ${
                dateRange === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1 text-sm rounded ${
                dateRange === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`px-3 py-1 text-sm rounded ${
                dateRange === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Year
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => changeMonth(-1)}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Previous
            </button>
            <div className="px-4 py-1 font-medium">
              {formatMonth(currentMonth)}
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {status === 'success' && viewMode === 'summary' && calendarData.length > 0 && (
        <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg">
          <div style={{ height: '60vh', width: '100%', maxWidth: '900px' }}>
            <Doughnut data={pieData} options={pieOptions} />
          </div>
        </div>
      )}

      {status === 'success' && viewMode === 'trend' && trendData && (
        <div className="bg-white p-4 rounded-lg shadow-lg" style={{ height: '70vh' }}>
          <Line data={trendData} options={trendOptions} />
        </div>
      )}

      {status === 'success' && viewMode === 'trend' && !trendData && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          No data available for this month.
        </div>
      )}
    </div>
  );
};

export default Cal;