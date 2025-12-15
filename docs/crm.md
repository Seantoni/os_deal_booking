# CRM System Documentation

## 💼 Overview

The CRM system provides comprehensive sales management with businesses, opportunities, sales pipeline, and task management.

## 🎯 Features

### Business Management
- **Fields**: Name, contact info (name, phone, email), category, owner, sales team, website, Instagram, description, tier (1-3)
- **Owner Assignment**: Defaults to creator, editable by admin users
- **Sales Team**: Inside Sales or Outside Sales designation
- **Linked Opportunities**: View and navigate to all opportunities for a business
- **Quick Actions**: Create business and opportunity simultaneously

### Opportunity Management
- **Pipeline Stages**: Visual clickable pipeline for stage updates
  - Iniciación → Reunión → Propuesta Enviada → Propuesta Aprobada → Won/Lost
- **Fields**: Business link, stage, dates, notes, responsible person, category, tier, contact info
- **Activity Tracking**: Automatic calculation of next/last activity dates from tasks
- **Task System**: Create, edit, complete, and delete tasks (meetings and to-dos)
- **Linked Business**: Quick access to edit linked business information
- **Request Integration**: Convert "WON" opportunities directly to booking requests with pre-filled data

### Task Management
- **Categories**: Meeting or To-do
- **Features**: Date tracking, completion status, notes
- **Auto-calculation**: Automatically updates opportunity activity dates
- **Optimistic Updates**: Instant UI updates without page reloads

## 🎨 UI/UX Features

### Side Panels
- Slide-in panels for forms (not modals) allowing simultaneous list and form viewing
- Right-side panel that doesn't block list view
- Smooth animations for open/close

### Compact Design
- Salesforce-inspired compact, professional layout
- Single-line editable fields
- Horizontal layout (label left, input right)
- Smaller icons for cleaner appearance

### Shimmer Loading
- Loading states with shimmer effects to prevent stale data display
- Clears previous data when opening forms
- Professional loading experience

### Views
- **Kanban Board**: Visual drag-and-drop pipeline visualization
- **Table View**: Alternative list view with search and filtering
- **Click to Edit**: Click any item in list or Kanban to open edit modal

## 🔄 Workflow

### Creating a Business
1. Click "Create Business" button
2. Fill in business information
3. Optionally create initial opportunity simultaneously
4. Business appears in list immediately (optimistic update)

### Creating an Opportunity
1. From business view: Click "Create Opportunity"
2. From opportunities tab: Click "Create Opportunity" and select business
3. Fill in opportunity details
4. Set initial pipeline stage
5. Opportunity appears in list and Kanban board

### Managing Tasks
1. Open opportunity form
2. Navigate to "Activity" tab
3. View upcoming and past tasks
4. Create new task with "+" button (also available on Details tab)
5. Edit, complete, or delete tasks
6. Activity dates auto-update

### Converting to Booking Request
1. Mark opportunity as "WON"
2. Click "Create Request" button
3. Booking request form opens pre-filled with opportunity data
4. Complete and submit booking request

## 📊 Pipeline Stages

1. **Iniciación**: Initial contact/lead
2. **Reunión**: Meeting scheduled/completed
3. **Propuesta Enviada**: Proposal sent to client
4. **Propuesta Aprobada**: Proposal approved by client
5. **Won**: Opportunity won, can create booking request
6. **Lost**: Opportunity lost, closed

## 🔗 Relationships

- **Business → Opportunities**: One-to-many (business can have multiple opportunities)
- **Opportunity → Tasks**: One-to-many (opportunity can have multiple tasks)
- **Opportunity → Business**: Many-to-one (opportunity belongs to one business)

## ⚡ Performance

- **Caching**: Businesses and opportunities cached for 30 seconds
- **Optimistic Updates**: Instant UI updates for all operations
- **Lazy Loading**: Tasks loaded on demand when viewing opportunity
- **Background Sync**: Data refreshes in background after mutations

## 🎯 Best Practices

1. **Create Business First**: Always create business before creating opportunities
2. **Use Tasks for Tracking**: Create tasks for all meetings and follow-ups
3. **Update Pipeline Regularly**: Keep pipeline stages current for accurate reporting
4. **Link Opportunities**: Always link opportunities to businesses for better organization
5. **Complete Tasks**: Mark tasks as complete to maintain accurate activity dates

