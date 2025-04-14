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

// Category colors (same as in caldav.js)
const categoryColors = {
  "Deep Learning": "#F59E0B",
  "Cassandra": "#8B5CF6",
  "Valyria": "#A855F7",
  "Meetings": "#3B82F6",
  "Social": "#10B981",
  "Wellness": "#4F46E5",
  "Routine": "#F97316"
};

const YearView = () => {
  const [status, setStatus] = useState('idle');
  const [yearlyData, setYearlyData] = useState(null);
  const [error, setError] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [maxWeek, setMaxWeek] = useState(getCurrentWeekNumber());

  // Get current week number
  function getCurrentWeekNumber() {
    const currentDate = new Date();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const days = Math.floor((currentDate - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return weekNumber;
  }

  useEffect(() => {
    const fetchYearlyData = async () => {
      setStatus('loading');
      try {
        const response = await fetch(`/api/caldav/yearly?year=${currentYear}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch yearly data');
        }
        
        // Adjust max week based on current year
        if (currentYear === new Date().getFullYear()) {
          setMaxWeek(getCurrentWeekNumber());
        } else if (currentYear < new Date().getFullYear()) {
          setMaxWeek(53); // Show full year for past years
        } else {
          setMaxWeek(0); // Future years should show no data
        }
        
        setYearlyData(data);
        setStatus('success');
      } catch (err) {
        // Generate mock data if API not yet implemented
        const categories = Object.keys(categoryColors);
        
        // Determine how many weeks to generate based on current year
        let weeksToGenerate = 52;
        if (currentYear === new Date().getFullYear()) {
          weeksToGenerate = getCurrentWeekNumber();
        } else if (currentYear > new Date().getFullYear()) {
          weeksToGenerate = 0; // No data for future years
        }
        
        // Generate mock data for weeks with category breakdown
        const mockWeeks = Array.from({ length: 52 }, (_, i) => {
          const weekData = {
            weekNumber: i + 1,
            categories: {},
            totalHours: 0
          };
          
          // Only add data for weeks that should have data
          if (i < weeksToGenerate) {
            // Add random hours for each category
            categories.forEach(category => {
              let multiplier = 1;
              if (category === 'Wellness') multiplier = 3;
              if (category === 'Routine') multiplier = 2.5;
              if (category === 'Cassandra') multiplier = 1.5;
              
              const hours = Math.round(Math.random() * 15 * multiplier * 10) / 10;
              weekData.categories[category] = hours;
              weekData.totalHours += hours;
            });
          }
          
          return weekData;
        });
        
        const mockData = {
          year: currentYear,
          weeks: mockWeeks,
          totalHours: Math.round(mockWeeks.reduce((sum, week) => sum + week.totalHours, 0) * 10) / 10,
          categories: categoryColors
        };
        
        setYearlyData(mockData);
        setStatus('success');
      }
    };

    fetchYearlyData();
  }, [currentYear]);

  // Prepare yearly chart data with separate lines for each category
  const prepareYearlyData = () => {
    if (!yearlyData || !yearlyData.weeks) {
      return null;
    }

    // Filter weeks based on maxWeek
    const filteredWeeks = yearlyData.weeks.filter(week => 
      currentYear < new Date().getFullYear() || week.weekNumber <= maxWeek
    );
    
    const labels = filteredWeeks.map(week => `Week ${week.weekNumber}`);
    
    // Get all unique categories from the data
    const allCategories = new Set();
    filteredWeeks.forEach(week => {
      if (week.categories) {
        Object.keys(week.categories).forEach(cat => allCategories.add(cat));
      }
    });
    
    // If no categories found, fall back to total hours
    if (allCategories.size === 0) {
      return {
        labels,
        datasets: [{
          label: 'Total Hours',
          data: filteredWeeks.map(week => week.totalHours),
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.2)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        }]
      };
    }
    
    // Create datasets for each category
    const datasets = Array.from(allCategories).map(category => {
      const color = categoryColors[category] || "#6B7280"; // Default gray if no color defined
      
      return {
        label: category,
        data: filteredWeeks.map(week => 
          week.categories && week.categories[category] ? week.categories[category] : 0
        ),
        borderColor: color,
        backgroundColor: color + '33', // Add transparency
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 1.5,
        pointHoverRadius: 4,
      };
    });
    
    return { labels, datasets };
  };

  const yearlyChartData = prepareYearlyData();

  // Calculate dynamic min and max for the x-axis
  const getAxisRange = () => {
    if (currentYear < new Date().getFullYear()) {
      // Past years: show weeks 1-52
      return { min: 1, max: 52 };
    } else if (currentYear > new Date().getFullYear()) {
      // Future years: no data
      return { min: 1, max: 52 };
    } else {
      // Current year: show weeks 1 to current week
      return { min: 1, max: maxWeek };
    }
  };

  const axisRange = getAxisRange();

  const yearlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
        }
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
          }
        }
      }
    },
    scales: {
      y: {
        stacked: false,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours',
          font: {
            size: 14,
            weight: 'bold'
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
        },
        min: `Week ${axisRange.min}`,
        max: `Week ${axisRange.max}`,
        grace: '5%' // Add some padding
      }
    }
  };

  return (
    <main className="w-full min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Yearly Time Tracking</h1>
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
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Back to Summary View
          </a>
        </div>
      </div>
    </main>
  );
};

export default YearView;