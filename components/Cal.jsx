// components/Cal.jsx
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Cal = () => {
  const [status, setStatus] = useState('idle');
  const [calendarData, setCalendarData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const response = await fetch('/api/caldav');
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
  }, []);

  const data = {
    labels: calendarData.map((item) => item.name),
    datasets: [
      {
        label: 'Hours per Calendar',
        data: calendarData.map((item) => item.hours),
        backgroundColor: '#4F46E5',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Hours per Calendar',
      },
    },
    scales: {
      x: {
        ticks: { autoSkip: false },
      },
    },
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Calendar Time Analytics</h1>
      {status === 'loading' && <p>Loading data...</p>}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {status === 'success' && calendarData.length > 0 && (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-6">Hours per Calendar</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <Bar data={data} options={options} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Cal;