// pages/api/caldav/yearly.js
import { DOMParser } from '@xmldom/xmldom';
import fetch from 'node-fetch';
import ical from 'node-ical';

const CALDAV_BASE = 'https://caldav.icloud.com';

// Calendar category mappings
const calendarCategories = {
  "Deep Learning": "Deep Learning",
  "Cassandra": "Cassandra",
  "Valyria": "Valyria",
  "Meetings & E": "Meetings",
  "Friends & Fam": "Social",
  "Wellness": "Wellness",
  "Personal & Content": "Routine",
  "Eating": "Routine",
  "Chores": "Routine"
};

// Category colors
const categoryColors = {
  "Deep Learning": "#F59E0B",
  "Cassandra": "#8B5CF6",
  "Valyria": "#A855F7",
  "Meetings": "#3B82F6",
  "Social": "#10B981",
  "Wellness": "#4F46E5",
  "Routine": "#F97316"
};

// Get week number from date
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

async function makeCalDAVRequest(url, method, headers, body) {
  const response = await fetch(url, { method, headers, body });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText}`);
  return responseText;
}

function toICalUTCString(date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

async function getCalendarEvents(calendarUrl, authHeader, startUTC, endUTC) {
  console.log('Fetching events for calendar:', calendarUrl);

  const queryBody = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${startUTC}" end="${endUTC}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const eventsXml = await makeCalDAVRequest(
    `${CALDAV_BASE}${calendarUrl}`,
    'REPORT',
    {
      Authorization: authHeader,
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
      'User-Agent': 'Mozilla/5.0 (iCalFetcher/1.0)',
      Prefer: 'return-minimal'
    },
    queryBody
  );
  return eventsXml;
}

function processCalendarEvents(eventsXml, calendarName) {
  if (!eventsXml) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(eventsXml, 'text/xml');
  const calendarDatas = doc.getElementsByTagName('calendar-data');
  
  const events = [];

  for (let i = 0; i < calendarDatas.length; i++) {
    const icalData = calendarDatas[i].textContent || '';
    try {
      // Use parseICS method instead of sync.parseICS to avoid the fs dependency
      const parsed = ical.parseICS(icalData);
      for (const key in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        const item = parsed[key];
        if (item.type === 'VEVENT') {
          const startTime = item.start;
          const endTime = item.end;
          
          if (startTime && endTime) {
            // Calculate duration in hours
            const durationHours = (endTime - startTime) / (1000 * 60 * 60);
            
            events.push({
              title: item.summary,
              start: startTime,
              end: endTime,
              calendarName: calendarName,
              durationHours: Math.round(durationHours * 10) / 10
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse iCal data:', err);
    }
  }
  
  return events;
}

export default async function handler(req, res) {
  // Get the requested year
  const { year } = req.query;
  
  if (!year || !/^\d{4}$/.test(year)) {
    return res.status(400).json({ error: 'Invalid year format. Use YYYY.' });
  }

  const yearInt = parseInt(year);
  
  // Try to extract credentials from the request body first.
  let { appleId, appPassword } = req.body || {};

  // If not provided, use environment variables.
  if (!appleId || !appPassword) {
    appleId = process.env.CALDAV_APPLE_ID;
    appPassword = process.env.CALDAV_APP_PASSWORD;
  }

  if (!appleId || !appPassword) {
    return res.status(400).json({ error: 'Missing appleId or appPassword.' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${appleId}:${appPassword}`).toString('base64');

  // Calculate start and end dates for the year
  const startDate = new Date(yearInt, 0, 1); // January 1st
  const endDate = new Date(yearInt + 1, 0, 1); // January 1st of next year
  
  const startUTC = toICalUTCString(startDate);
  const endUTC = toICalUTCString(endDate);

  try {
    // 1) Get the list of calendars
    const calendarsXml = await makeCalDAVRequest(
      `${CALDAV_BASE}/8310088992/calendars/`,
      'PROPFIND',
      {
        Authorization: authHeader,
        Depth: '1',
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (iCalFetcher/1.0)'
      },
      `<?xml version="1.0" encoding="utf-8"?>
       <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
         <d:prop>
           <d:resourcetype />
           <d:displayname />
           <c:supported-calendar-component-set />
         </d:prop>
       </d:propfind>`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(calendarsXml, 'text/xml');
    const responses = doc.getElementsByTagName('response');

    // Fetch all calendar events
    const calendarPromises = [];
    for (let i = 0; i < responses.length; i++) {
      const href = responses[i].getElementsByTagName('href')[0]?.textContent;
      const displayName = responses[i].getElementsByTagName('displayname')[0]?.textContent;
      
      // Skip if it's not a valid calendar or if it's Reminders
      if (!href || !displayName || 
          href === '/8310088992/calendars/' || 
          displayName.includes('Reminders') ||
          href.includes('notification') || 
          href.includes('inbox') || 
          href.includes('outbox')) {
        continue;
      }

      calendarPromises.push(
        getCalendarEvents(href, authHeader, startUTC, endUTC)
          .then((eventsXml) => processCalendarEvents(eventsXml, displayName))
      );
    }

    // Wait for all calendar data to be fetched
    const allCalendarEvents = await Promise.all(calendarPromises);
    const allEvents = allCalendarEvents.flat();

    // Initialize weeks data structure (53 weeks)
    const weeks = Array.from({ length: 53 }, (_, i) => ({
      weekNumber: i + 1,
      totalHours: 0,
      categories: {},
      events: []
    }));

    // Process all events and group by week
    allEvents.forEach(event => {
      const weekNum = getWeekNumber(event.start);
      
      // Get the category for this calendar
      const category = calendarCategories[event.calendarName] || event.calendarName;
      
      // Ensure weekNum is within bounds (sometimes week 53 can happen)
      if (weekNum > 0 && weekNum <= weeks.length) {
        // Add to total hours
        weeks[weekNum - 1].totalHours += event.durationHours;
        
        // Add to category hours
        if (!weeks[weekNum - 1].categories[category]) {
          weeks[weekNum - 1].categories[category] = 0;
        }
        weeks[weekNum - 1].categories[category] += event.durationHours;
        
        // Store event
        weeks[weekNum - 1].events.push(event);
      }
    });

    // Round all hours to one decimal place
    weeks.forEach(week => {
      week.totalHours = Math.round(week.totalHours * 10) / 10;
      
      // Round category hours
      Object.keys(week.categories).forEach(cat => {
        week.categories[cat] = Math.round(week.categories[cat] * 10) / 10;
      });
    });

    // Return the structured yearly data
    return res.status(200).json({
      year: yearInt,
      weeks: weeks,
      totalEvents: allEvents.length,
      totalHours: Math.round(weeks.reduce((sum, week) => sum + week.totalHours, 0) * 10) / 10,
      categories: categoryColors
    });
    
  } catch (error) {
    console.error('Request failed:', error);
    return res.status(500).json({ error: error.message });
  }
}