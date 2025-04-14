import React, { useState, useEffect, useMemo } from 'react';

const CACHE_KEY = 'cal-tracker-project-data';
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

const ProjectTracker = () => {
  const [status, setStatus] = useState('idle');
  const [projectData, setProjectData] = useState([]);
  const [error, setError] = useState(null);

  const extractHashtags = (title) => {
    if (!title || typeof title !== 'string') return [];
    return title
      .split(' ')
      .filter((word) => word.startsWith('#'))
      .map((tag) => tag.substring(1).toLowerCase())
      .filter((tag) => tag.length > 0);
  };

  const formatProjectName = (tag) => {
    return tag
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const extractProjectsFromEvents = (events) => {
    const projects = {};
    if (!Array.isArray(events)) {
      console.error('Events data is not an array:', events);
      return [];
    }
    events.forEach((event) => {
      if (!event || !event.title || !event.durationHours) return;

      const tags = extractHashtags(event.title);
      tags.forEach((tag) => {
        const cleanTag = tag.replace(/[^a-z0-9-_]/g, '');
        if (!projects[cleanTag]) {
          projects[cleanTag] = {
            id: cleanTag,
            name: formatProjectName(cleanTag),
            hours: 0,
            lastUpdated: null,
          };
        }
        projects[cleanTag].hours += event.durationHours;
        const eventDate = new Date(event.end);
        if (
          !projects[cleanTag].lastUpdated ||
          eventDate > new Date(projects[cleanTag].lastUpdated)
        ) {
          projects[cleanTag].lastUpdated = eventDate;
        }
      });
    });
    return Object.values(projects);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
              console.log('Using cached project data');
              setProjectData(data);
              setStatus('success');
              return;
            }
          } catch (err) {
            console.warn('Failed to parse cached project data', err);
          }
        }

        setStatus('loading');

        const currentYear = new Date().getFullYear();
        const response = await fetch(`/api/caldav/yearly?year=${currentYear}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch calendar data: ${response.status} - ${errorText}`);
        }
        const data = await response.json();

        let allEvents = [];
        if (data.weeks && Array.isArray(data.weeks)) {
          data.weeks.forEach((week) => {
            if (week && week.events && Array.isArray(week.events)) {
              allEvents = [...allEvents, ...week.events];
            }
          });
        }
        console.log(`Found ${allEvents.length} calendar events for year ${currentYear}`);

        const projects = extractProjectsFromEvents(allEvents);
        projects.sort((a, b) => b.hours - a.hours);

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: projects,
            timestamp: Date.now(),
          })
        );

        setProjectData(projects);
        setStatus('success');
      } catch (err) {
        console.error('Error fetching project data:', err);
        setError(err.message);
        setStatus('error');
      }
    };

    fetchData();
  }, []);

  const formattedProjects = useMemo(() => {
    return projectData.map((project) => {
      const progress = Math.min(Math.round((project.hours / 20) * 100), 100);
      const isComplete = project.hours >= 20;
      return {
        ...project,
        progress,
        isComplete,
      };
    });
  }, [projectData]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg w-full">
      <h2 className="text-2xl font-bold mb-2">20-Hour Rule Projects</h2>
      <p className="text-gray-500 text-sm mb-4">Tracking hours for {new Date().getFullYear()}</p>

      {status === 'loading' && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {formattedProjects.length === 0 && status === 'success' && (
        <p className="py-4 text-center text-gray-500">
          No tagged projects found. Use <code>#project</code> in event titles.
        </p>
      )}

      {formattedProjects.length > 0 && (
        <div className="max-h-[350px] overflow-y-auto pr-1">
          {formattedProjects.map((project) => (
            <div key={project.id} className="mb-6">
              <div className="flex items-baseline mb-2">
                <h3 className="text-xl font-bold">{project.name} ({project.hours.toFixed(1)} Hours)</h3>
              </div>

              <div style={{ position: 'relative', width: '100%', height: '24px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div
                  style={{
                    width: `${project.progress}%`,
                    height: '100%',
                    backgroundColor: project.isComplete ? '#059669' : '#3b82f6',
                    borderRadius: project.progress < 100 ? '4px 0 0 4px' : '4px',
                    transition: 'width 0.5s ease, opacity 0.3s ease',
                    opacity: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: project.progress > 50 ? 'white' : 'black',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {project.progress}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectTracker;