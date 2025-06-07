# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tableau is a desktop tabletop gaming campaign management application built with React + TypeScript frontend and Rust backend using Tauri. It allows dungeon masters to create and display campaign content with support for landscapes, character splashes, combat scenarios, and entity management.

## Development Commands

### Frontend Development

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build frontend for production
npm run lint         # Run ESLint for code quality checks
npm run preview      # Preview production build locally
```

### Tauri Desktop App

```bash
npm run tauri dev    # Start Tauri development app with backend
npm run tauri build  # Build desktop application for distribution
```

### Backend Development

The Rust backend is in `src-tauri/` and rebuilds automatically with `tauri dev`. No separate commands needed.

## Architecture Overview

### Multi-Window Desktop Application

-   **Main Constructor Windows**: Interactive editing interfaces for campaigns and combat scenarios
-   **Display Windows**: Separate presentation windows for projecting content (dual-monitor support)
-   **Cross-Window Communication**: Real-time sync via Tauri's event system (`emit`/`listen`)

### Frontend Architecture (React + TypeScript)

-   **Routing**: HashRouter with 5 main routes including parameterized combat displays
-   **State Management**: Centralized React Context with localStorage persistence and custom hooks
-   **Component Patterns**: Constructor components (editing), Display components (presentation), Element components (reusable UI)
-   **Backend Integration**: Heavy use of Tauri's `invoke` API for Rust backend communication

### Backend Architecture (Rust + Tauri)

-   **File Structure**: Organized in `src-tauri/src/` with `lib.rs` (main logic), `models.rs` (data structures), `utils.rs` (file operations)
-   **Commands**: 20+ Tauri commands for chapter management, asset handling, entity operations, and hexgrid generation
-   **Asset Management**: Structured file system at `../tableau/` with automatic directory creation
-   **Image Processing**: Custom hexagonal masking for entity icons and image manipulation

### Data Flow Patterns

1. User interactions trigger state updates in React components
2. Changes sent to Rust backend via `invoke` commands
3. Backend performs file operations and data persistence
4. Global state reload functions fetch fresh data
5. UI re-renders with updated state
6. Cross-window sync via events for display windows

## Key Technical Concepts

### Chapter-Based Organization

-   Projects organized as "chapters" with JSON metadata
-   Each chapter contains combat scenarios, landscapes, splash images
-   Hierarchical structure: Chapter → Combat Scenarios → Entities

### Entity System

-   Game entities with properties: icon, allegiance, size, location, hitpoints, visibility, death status
-   Hexagonal grid positioning system for tactical combat
-   Automatic ID generation and file management

### Display Window System

-   Dynamic content switching between campaign view (landscapes + splashes) and combat view (battlemaps + entities)
-   Event-driven updates when selections change in constructor windows
-   Fullscreen toggle functionality for presentations

### Asset Pipeline

-   Native file dialogs for image uploads via Tauri
-   Automatic image processing (cropping, format conversion, hexagonal masking)
-   Organized storage in `/tableau/assets/` with type-specific folders

## Important Implementation Details

### Event Communication

Use Tauri's event system for cross-window communication:

```typescript
emit('eventName', data); // Send events
listen('eventName', callback); // Listen for events
```

### State Management Pattern

Global state uses React Context with localStorage persistence:

```typescript
const { chapterData, reloadChapterData } = useGlobalState();
// Always call reloadChapterData() after backend operations
```

### Backend Command Pattern

All backend operations use Tauri's invoke pattern:

```typescript
invoke('command_name', { param1, param2 })
  .then(result => /* handle success */)
  .catch(error => /* handle error */)
```

### Hexgrid Mathematics

Custom hexagonal grid calculations in `src/hexgrid.ts` for:

-   Converting between pixel coordinates and hex positions
-   Grid overlay generation with configurable size and offsets
-   Entity positioning on tactical combat maps

## File Structure Notes

-   `src/components/`: React components organized by functionality
-   `src/styles/`: CSS files, primarily `Constructor.css` for main styling
-   `src-tauri/src/`: Rust backend code with clear separation of concerns
-   `../tableau/`: Runtime asset directory created by backend (not in repository)
