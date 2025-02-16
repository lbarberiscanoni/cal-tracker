// components/Cal.jsx
import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Cal = () => {
  const [status, setStatus] = useState('idle');
  const [calendarData, setCalendarData] = useState([]);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('week');

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

  const barData = {
    labels: calendarData.map((item) => item.name),
    datasets: [
      {
        label: 'Hours per Category',
        data: calendarData.map((item) => item.hours),
        backgroundColor: '#4F46E5',
      },
    ],
  };

  const pieData = {
    labels: calendarData.map((item) => item.name),
    datasets: [
      {
        data: calendarData.map((item) => item.hours),
        backgroundColor: [
          '#4F46E5', // indigo
          '#EF4444', // red
          '#10B981', // green
          '#F59E0B', // yellow
          '#6366F1', // blue
          '#EC4899', // pink
          '#8B5CF6', // purple
          '#14B8A6', // teal
        ],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Hours per Category',
        font: { size: 14 }
      },
    },
    scales: {
      x: {
        ticks: { 
          autoSkip: false, 
          maxRotation: 45, 
          minRotation: 45,
          font: { size: 10 }
        },
      },
      y: {
        beginAtZero: true,
      }
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 10,
          font: { size: 10 }
        }
      },
      title: {
        display: true,
        text: 'Time Distribution',
        font: { size: 14 }
      },
    },
  };

  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar Time Analytics</h1>
      
      <div className="flex gap-2 mb-6">
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

      {status === 'success' && calendarData.length > 0 && (
        <div style={{ display: 'flex', gap: '20px', height: '70vh' }}>
          <div className="w-1/2 bg-white p-4 rounded-lg shadow-lg">
            <Bar data={barData} options={barOptions} />
          </div>
          <div className="w-1/2 bg-white p-4 rounded-lg shadow-lg">
            <Doughnut data={pieData} options={pieOptions} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Cal;