Tracking My Time

# Roadmap
- [ ] Add Google Cal for meetings and stuff
- [ ] Track Sleep in a better way
- [ ] weekly email summary
- [ ] LLM analyzing my time allocation

- [ ] "4000 weeks" view


## Apr 14th 2025

- ok let's do this

- let's take a moment to brain dump what we want to accomplish
    - ok moved it to the Roadmap section

- [x] group calendars by color

- [x] Pie chart should show percentages

- [x] Host this on Vercel
    - jk it's already hosted https://cal-tracker-ecru.vercel.app/

- Now let's fill up the history
    - ok this is a good starting point but there are a few things to cleanup
        - Monthly Trends looks incorrect
            - maybe drop the monthly view altogether
    - I gotta cache maybe with useMemo

- ok let's get back into this
    
- now let's brianstorm the 20h rule feature with Grok 
    - "For the 20-hour rule, we could brainstorm a new view—a progress bar or a small gauge for each active project, showing hours accumulated toward 20." 
    - "Picture a dashboard on the homepage (next to the weekly chart) with cards for each deep work project, like “Cassandra Model Training: 12/20 hours” or “Valyria Design: 18/20 hours."
    - Grok is suggesting using a tagging system within the event itself like "Tiger Beetle #banking-core"
        - this would also support logging across multiple projects

- [ ] track the 20h rule 
    - ok I'm accepting Grok's suggestion
    - implementing this through `ProjectTracker.jsx`
    - it's not displaying correctly

- I had to switch to Grok because I ran into Claude limits lol

- let's make sure we are tracking across all things as opposed to just the week