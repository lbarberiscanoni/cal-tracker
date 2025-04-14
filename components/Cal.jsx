// components/Cal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

// Cache keys
const CACHE_KEY = 'cal-tracker-weekly-data';
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

const Cal = () => {
  const [status, setStatus] = useState('idle');
  const [calendarData, setCalendarData] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      // Check if we have cached data
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          // Check if the cache is still valid (not expired)
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            console.log('Using cached weekly data');
            setCalendarData(data);
            setStatus('success');
            return;
          }
        } catch (err) {
          console.warn('Failed to parse cached data', err);
          // Continue to fetch if parsing fails
        }
      }
      
      // Fetch fresh data if no cache or cache expired
      setStatus('loading');
      try {
        // Default to week range
        const response = await fetch(`/api/caldav?range=week`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch calendar data');
        }
        
        // Cache the fresh data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        setCalendarData(data);
        setStatus('success');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    fetchData();
  }, []);

  // Sort and prepare the pie chart data (memoized to prevent unnecessary recalculations)
  const { pieData, pieOptions } = useMemo(() => {
    // Sort the data for pie chart
    const sortedData = [...calendarData].sort((a, b) => b.hours - a.hours);
    const totalHours = sortedData.reduce((sum, cal) => sum + cal.hours, 0);

    const data = {
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

    // Chart options
    const options = {
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

    return { pieData: data, pieOptions: options };
  }, [calendarData]);

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Weekly Time Tracking</h1>
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
        <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg">
          <div style={{ height: '60vh', width: '100%', maxWidth: '900px' }}>
            <Doughnut data={pieData} options={pieOptions} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Cal;