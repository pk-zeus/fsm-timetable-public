# FSM Timetable

A student-facing timetable platform for **FAST School of Management (FSM), FAST-NUCES Islamabad**, designed to provide faster, clearer, and more accessible access to timetable information than a conventional spreadsheet.

## Overview

FSM Timetable transforms structured timetable data into an interactive web application designed for everyday student use.

The platform provides a centralized interface for exploring classes, instructors, rooms, schedule conflicts, and personal timetable views across desktop and mobile devices.

The application is delivered as a **Progressive Web App (PWA)**, allowing it to provide an app-like experience without requiring a separate native Android or iOS application.

## Current Features

### 📅 Timetable

* Regular and repeat-course timetable offerings
* Daily and weekly timetable views
* Current and upcoming class information
* Live countdown for the next/current class
* Responsive interface for mobile and desktop

### 🔎 Academic Search

* All Classes
* Teacher Finder
* Instructor timetable information
* Timetable-based room availability
* Clash Finder for identifying timetable conflicts

### 🔗 Sharing

* Shareable timetable links
* Preserves selected timetable settings through the shared link

### 📄 Export

* Print-friendly weekly timetable
* PDF export
* Calendar export using `.ics`

### 🌙 Appearance

* Light theme
* Dark theme
* System theme
* Persistent theme preference

### 📱 Progressive Web App

The platform is designed as a PWA to provide broad device accessibility across:

* Android
* iOS
* Windows
* macOS
* Other modern browsers supporting the required web standards

## Data Processing

The application does not treat the timetable spreadsheet as a static document.

Timetable data is processed into structured information representing relevant entities such as:

* Courses
* Sections
* Instructors
* Rooms
* Days
* Time slots
* Regular and repeat-course offerings

This structured representation allows the application to provide search, filtering, conflict detection, room availability, live schedule information, and export functionality through a unified interface.

## Technology

The project is built as a modern TypeScript-based web application with a component-driven frontend and Progressive Web App capabilities.

Key technologies include:

* TypeScript
* React
* TanStack Router
* Vite
* Tailwind CSS
* shadcn/ui / Radix UI components
* Progressive Web App technologies
* Vercel deployment

## Project Structure

The application separates presentation, routing, shared components, theme management, and timetable-related functionality into dedicated modules.

The repository is intended to make the implementation available for technical review and development purposes.

## Development

Clone the repository and install the project dependencies using the package manager configured for the project.

```bash
git clone https://github.com/[YOUR-USERNAME]/fsm-timetable.git
cd fsm-timetable
npm install
npm run dev
```

Create any required environment configuration according to the project's existing configuration and deployment requirements.

## Deployment

The production application is deployed through Vercel.

**Live Platform:**
https://fast-schedule.vercel.app/

## Scope and Data Disclaimer

FSM Timetable is an independently developed student-facing platform intended to improve the accessibility and usability of timetable information.

The platform does not replace official university systems or official academic communications. Timetable information should be considered subject to the University's official timetable and administrative communications.

Any future institutional adoption, circulation, or integration remains subject to the appropriate review and approval processes of FAST School of Management.

## Future Development

Potential future releases may extend the platform beyond timetable functionality into additional student-facing utilities, including:

* Campus announcements
* Academic calendar
* Campus events
* Café and food information
* Academic resources
* Campus search
* Smart class notifications
* Additional student utilities

These features are subject to future development and review.

## License

This project is licensed under the **MIT License**.

See [`LICENSE`](./LICENSE) for the complete license text.

## Author

**Wamiz Rehman**

Independent student developer
FAST-NUCES Islamabad
