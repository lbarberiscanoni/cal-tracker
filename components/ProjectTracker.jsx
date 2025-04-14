// components/ProjectTracker.jsx
import React, { useState, useEffect, useMemo } from 'react';

const CACHE_KEY = 'cal-tracker-project-data';
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

const ProjectTracker = () => {
  const [status, setStatus] = useState('idle');
  const [projectData, setProjectData] = useState([]);
  const [error, setError] = useState(null);
  
  // Extract hashtags from a title
  const extractHashtags = (title) => {
    if (!title || typeof title !== 'string') {
      return [];
    }
    
    // Split on spaces and filter for hashtags
    const words = title.split(' ');
    const hashtags = words.filter(word => word.startsWith('#'))
                          .map(tag => tag.substring(1).toLowerCase())
                          .filter(tag => tag.length > 0);
    
    return hashtags;
  };
  
  // Extract project information from events
  const extractProjectsFromEvents = (events) => {
    const projects = {};
    
    if (!Array.isArray(events)) {
      console.error("Events data is not an array:", events);
      return [];
    }
    
    events.forEach(event => {
      // Skip if event doesn't have the required properties
      if (!event || !event.title || !event.durationHours) {
        return;
      }
      
      // Extract hashtags from the title
      const tags = extractHashtags(event.title);
      
      // Process each tag as a project
      tags.forEach(tag => {
        // Remove any non-alphanumeric characters after the tag
        const cleanTag = tag.replace(/[^a-z0-9-_]/g, '');
        
        if (!projects[cleanTag]) {
          projects[cleanTag] = {
            id: cleanTag,
            name: formatProjectName(cleanTag),
            hours: 0,
            lastUpdated: null
          };
        }
        
        // Add hours to the project
        projects[cleanTag].hours += event.durationHours;
        
        // Update lastUpdated if this event is more recent
        const eventDate = new Date(event.end);
        if (!projects[cleanTag].lastUpdated || 
            eventDate > new Date(projects[cleanTag].lastUpdated)) {
          projects[cleanTag].lastUpdated = eventDate;
        }
      });
    });
    
    return Object.values(projects);
  };
  
  // Format project names to be more readable
  const formatProjectName = (tag) => {
    return tag
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if we have cached data
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const { data, timestamp } = JSON.parse(cachedData);
            // Check if the cache is still valid (not expired)
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
        
        // Fetch from the yearly data endpoint to get detailed events
        const currentYear = new Date().getFullYear();
        const response = await fetch(`/api/caldav/yearly?year=${currentYear}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch calendar data: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // Extract all events from all weeks
        let allEvents = [];
        if (data.weeks && Array.isArray(data.weeks)) {
          data.weeks.forEach(week => {
            if (week && week.events && Array.isArray(week.events)) {
              allEvents = [...allEvents, ...week.events];
            }
          });
        }
        
        console.log(`Found ${allEvents.length} calendar events`);
        
        // Extract projects from events
        const projects = extractProjectsFromEvents(allEvents);
        
        // Sort by hours (descending)
        projects.sort((a, b) => b.hours - a.hours);
        
        console.log(`Extracted ${projects.length} projects with hashtags`);
        
        // Cache the project data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: projects,
          timestamp: Date.now()
        }));
        
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
  
  // Calculate progress and format data for display
  const formattedProjects = useMemo(() => {
    return projectData.map(project => {
      const progress = Math.min(Math.round((project.hours / 20) * 100), 100);
      const isComplete = project.hours >= 20;
      
      // Format time string (e.g., "4.0 pm")
      const lastUpdated = project.lastUpdated ? new Date(project.lastUpdated) : null;
      const timeString = lastUpdated 
        ? `${lastUpdated.getHours() % 12 || 12}.${Math.floor(lastUpdated.getMinutes() / 10) || 0} ${lastUpdated.getHours() >= 12 ? 'pm' : 'am'}`
        : '';
      
      return {
        ...project,
        progress,
        isComplete,
        timeString
      };
    });
  }, [projectData]);

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold mb-6">20-Hour Rule Projects</h2>
      
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
        <div className="py-6 text-center text-gray-500">
          <p>No tagged projects found. Add hashtags to your calendar events like "Project Meeting #project-name" to track progress.</p>
        </div>
      )}
      
      {formattedProjects.length > 0 && (
        <div>
          {formattedProjects.map(project => (
            <div key={project.id} className="mb-12">
              <h3 className="text-xl font-bold">{project.name}</h3>
              <div className="text-gray-600 mb-4">{project.timeString}</div>
              
              {/* Simple stats */}
              <div className="text-lg font-bold">{project.hours.toFixed(1)}</div>
              <div className="text-sm text-gray-500 mb-1">Hours</div>
              
              <div className="text-lg font-bold">{project.progress}%</div>
              <div className="text-sm text-gray-500 mb-1">Consistency</div>
              
              <div className="text-lg font-bold">{project.hours.toFixed(1)}/20</div>
              <div className="text-sm text-gray-500 mb-4">Completion</div>
              
              {/* Simple visual bar - basic version that should work in all environments */}
              <div className="w-full bg-gray-200 h-4 mb-6 rounded-sm">
                <div 
                  className="bg-blue-500 h-4 rounded-sm" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
          
          {/* Control buttons */}
          <div className="flex gap-2 mt-8">
            <button className="border border-gray-300 px-4 py-2 rounded">
              ORDER
            </button>
            <button className="border border-gray-300 px-4 py-2 rounded">
              COLLAPSE
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>Add <code className="bg-gray-100 px-1 rounded">#project-name</code> hashtags to your calendar events to track progress toward the 20-hour rule.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTracker;