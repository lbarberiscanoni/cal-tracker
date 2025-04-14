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

ChartJS.register(Title, Tooltip, Legend, ArcElement, ChartDataLabels);

const CACHE_KEY = 'cal-tracker-weekly-data';
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes

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
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setCalendarData(data);
            setStatus('success');
            return;
          }
        } catch {
          // ignore parse error
        }
      }
      setStatus('loading');
      try {
        const response = await fetch('/api/caldav?range=week');
        const jsonData = await response.json();
        if (!response.ok) {
          throw new Error(jsonData.error || 'Failed to fetch calendar data');
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: jsonData,
          timestamp: Date.now()
        }));
        setCalendarData(jsonData);
        setStatus('success');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    fetchData();
  }, []);

  const { pieData, pieOptions } = useMemo(() => {
    const sortedData = [...calendarData].sort((a, b) => b.hours - a.hours);
    const totalHours = sortedData.reduce((sum, cal) => sum + cal.hours, 0);

    const data = {
      labels: sortedData.map((item) => {
        const pct = totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0;
        return `${item.name} (+${item.hours})`;
      }),
      datasets: [
        {
          data: sortedData.map((item) => item.hours),
          backgroundColor: sortedData.map((item) => item.color),
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false, 
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 15,
            font: { size: 14 },
            padding: 10
          }
        },
        title: {
          display: true,
          text: 'Time Distribution',
          font: { size: 20, weight: 'bold' }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw;
              const pct = totalHours > 0 ? Math.round((val / totalHours) * 100) : 0;
              return `${val} hours (${pct}%)`;
            }
          }
        },
        datalabels: {
          formatter: (value) => {
            const pct = totalHours > 0 ? Math.round((value / totalHours) * 100) : 0;
            return pct >= 3 ? `${pct}%` : '';
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Weekly Time Tracking</h1>

      {/* Loading indicator */}
      {status === 'loading' && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Chart */}
      {status === 'success' && calendarData.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-lg w-full">
          {/* 
            A container that gives a fixed height 
            maintainAspectRatio=false in pieOptions 
            => chart stretches to fill 
          */}
          <div className="relative w-full" style={{ height: '500px' }}>
            <Doughnut data={pieData} options={pieOptions} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Cal;
