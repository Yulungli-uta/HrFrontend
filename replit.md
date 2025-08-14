# WsUtaSystem - Human Resources Management

## Overview

WsUtaSystem is a comprehensive Human Resources Management application built with a modern full-stack architecture. The system provides functionality for managing employee data, attendance tracking, permissions and vacations, payroll processing, and organizational publications. It features a React-based frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database interactions
- **Development**: Hot module replacement with Vite integration
- **API Structure**: RESTful API with comprehensive CRUD operations
- **Error Handling**: Centralized error handling middleware

### Database Schema
The application uses PostgreSQL with the following main entities:
- **Personas**: Employee personal information
- **Contratos**: Employment contracts
- **Puestos**: Job positions
- **Turnos**: Shift management (plans, assignments, details)
- **Marcaciones**: Attendance tracking
- **Permisos**: Leave requests
- **Vacaciones**: Vacation management
- **Recuperaciones**: Make-up time tracking
- **Subrogaciones**: Substitution assignments
- **Nomina**: Payroll system (periods, concepts, movements)
- **CV Management**: Education, experience, certifications
- **Publicaciones**: Organizational publications

### Authentication & Authorization
Currently implements a basic user system with username-based authentication. The system is designed to support role-based access control expansion.

### API Design Patterns
- RESTful endpoints following `/api/{resource}` convention
- JSON camelCase response format
- CORS enabled for cross-origin requests
- Consistent error response structure
- Request/response logging middleware

### Client-Server Communication
- Type-safe API calls using shared schema definitions
- Optimistic updates with TanStack Query
- Real-time form validation with Zod schemas
- Centralized error handling and toast notifications

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **UI Components**: Radix UI primitives for accessible components
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React for consistent iconography

### Development Tools
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: ESLint and Prettier (implied by structure)
- **Build System**: Vite with TypeScript support
- **Database Migrations**: Drizzle Kit for schema management

### Runtime Dependencies
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Form Validation**: Zod for runtime type validation
- **HTTP Client**: Native fetch API with custom wrapper
- **CSS Framework**: Tailwind CSS with PostCSS

The application is structured as a monorepo with shared TypeScript definitions between client and server, ensuring type consistency across the full stack. The architecture supports scalable development with clear separation of concerns and modern development practices.