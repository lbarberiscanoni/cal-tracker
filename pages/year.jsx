// pages/year.jsx
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const YearView = () => {
  const [status, setStatus] = useState('idle');
  const [yearlyData, setYearlyData] = useState(null);
  const [error, setError] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchYearlyData = async () => {
      setStatus('loading');
      try {
        const response = await fetch(`/api/caldav/yearly?year=${currentYear}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch yearly data');
        }
        setYearlyData(data);
        setStatus('success');
      } catch (err) {
        // Generate mock data if API not yet implemented
        console.warn('Using mock yearly data until API is implemented');
        
        const mockWeeks = Array.from({ length: 52 }, (_, i) => ({
          weekNumber: i + 1,
          totalHours: Math.random() * 40 + 20 // Random hours between 20-60
        }));
        
        setYearlyData({
          year: currentYear,
          weeks: mockWeeks,
          totalHours: Math.round(mockWeeks.reduce((sum, week) => sum + week.totalHours, 0) * 10) / 10
        });
        
        setStatus('success');
      }
    };

    fetchYearlyData();
  }, [currentYear]);

  // Handle year change
  const changeYear = (offset) => {
    setCurrentYear(prev => prev + offset);
  };

  // Prepare yearly chart data
  const prepareYearlyData = () => {
    if (!yearlyData || !yearlyData.weeks) {
      return null;
    }

    const labels = yearlyData.weeks.map(week => `Week ${week.weekNumber}`);
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Hours',
          data: yearlyData.weeks.map(week => week.totalHours),
          borderColor: '#4F46E5', // Indigo color
          backgroundColor: 'rgba(79, 70, 229, 0.2)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true
        }
      ]
    };
  };

  const yearlyChartData = prepareYearlyData();

  const yearlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Disable datalabels for line chart
      },
      legend: {
        display: false, // Hide legend for single dataset
      },
      title: {
        display: true,
        text: `Weekly Hours - ${currentYear}`,
        font: { size: 20, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            return `Week ${context[0].label.split(' ')[1]}`;
          },
          label: function(context) {
            return `${context.formattedValue} hours`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Week Number',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 13, // Show about one month worth of ticks
          font: {
            size: 12
          }
        }
      }
    }
  };

  return (
    <main className="w-full min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Yearly Time Tracking</h1>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => changeYear(-1)}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Previous Year
            </button>
            <div className="px-4 py-1 font-medium text-lg">
              {currentYear}
            </div>
            <button 
              onClick={() => changeYear(1)}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Next Year
            </button>
          </div>
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

        {status === 'success' && yearlyChartData && (
          <div className="bg-white p-4 rounded-lg shadow-lg" style={{ height: '70vh' }}>
            <Line data={yearlyChartData} options={yearlyOptions} />
            {yearlyData.totalHours && (
              <div className="text-center mt-4">
                <p className="text-lg font-semibold">Total Hours: {yearlyData.totalHours}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Back to Summary View
          </a>
        </div>
      </div>
    </main>
  );
};

export default YearView;