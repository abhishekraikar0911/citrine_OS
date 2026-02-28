# CitrineOS User UI: Deep-Dive Technical Guide

Welcome to the **CitrineOS User UI** engineering guide. This document provides a production-grade breakdown of the User UI, its containerized architecture, and the specific file-level flows that power it.

---

## 🏗️ Containerized Architecture

CitrineOS is split into several containers to ensure that charging logic remains separated from the user interface.

### 1. CitrineOS Core Container (`csms-core`)
- **Role**: The central "brain". It manages all OCPP protocol logic, message routing, and business rules.
- **Inside the Container**:
    - **Node.js Environment**: Runs the TypeScript transpiled code for the Central System.
    - **Key File: [entrypoint.sh](file:///opt/csms/citrineos-core/entrypoint.sh)**: This script ensures the database is ready by running migrations (`npm run migrate`) before the application starts.
    - **Core Modules**: Located in `03_Modules/`, these handle specific domains like `Transactions` and `EVDriver`.
- **Reason for Use**: It isolates critical hardware communication from UI crashes. Even if the UI container fails, the charger will continue to charge because the session is managed here.

### 2. User UI Container (`citrineos-user-ui`)
- **Role**: A Next.js (React) application providing the dashboard and control interface for users.
- **Inside the Container**:
    - **Standalone Server**: Using Next.js `standalone` output for minimal image size.
    - **Key File: [Dockerfile](file:///opt/csms/citrineos-user-ui/Dockerfile)**: Multi-stage build that compiles the UI and runs it with a slim Node.js image.
    - **Compose File: [docker-compose-user-ui.yml](file:///opt/csms/docker-compose-user-ui.yml)**: Defines the service, port 3001 mapping, and environment variables.
- **Why**: This allows the UI to be scaled independently of the backend core. It focuses purely on the "Human-Machine Interface" (HMI).

---

## 🌐 Service URLs & Access

| Mode | URL | Port |
| :--- | :--- | :--- |
| **Production (Docker)** | `http://<IP>:3001` | 3001 |
| **Development (Local)** | `http://<IP>:9310` | 9310 |

---

## 📊 Real-time Data Polling Flow

The UI uses a **polling mechanism** to show live charging metrics (SoC, Power, etc.) without page refreshes.

### File & Logic Breakdown

| Level | Component / File | Logic | Reasoning |
| :--- | :--- | :--- | :--- |
| **Frontend** | **[page.tsx](file:///opt/csms/citrineos-user-ui/src/app/page.tsx)** | `useEffect` uses `setInterval` (3s) to call `fetchTelemetry()`. | Provides "live" feel while remaining simple and robust against connection drops. |
| **Data Source** | **[queries.ts](file:///opt/csms/citrineos-user-ui/src/lib/queries.ts)** | Defines the `GET_STATION_DETAILS` GraphQL query. | Centralizes all database interactions for easier maintenance. |
| **Proxy** | `/api/graphql` | Next.js API route that forwards requests to Hasura. | Keeps administrative secrets (like `x-hasura-admin-secret`) hidden on the server. |
| **Backend** | `Hasura` | Executes the query against `MeterValues` table. | Automatically optimizes database reads for high performance. |

---

## ⚡ Remote Start/Stop: The Chain of Command

When a user clicks "Start", a sequence of messages travels across multiple containers and specific files.

### Detailed Flow (Remote Start)

1.  **User Action**: User clicks button in `page.tsx`.
2.  **UI Call**: `handleStart()` in `page.tsx` sends a `POST` to `csms-core/ocpp/1.6/evdriver/remoteStartTransaction`.
3.  **Core API**: **[EVDriver/1.6/MessageApi.ts](file:///opt/csms/citrineos-core/03_Modules/EVDriver/src/module/1.6/MessageApi.ts)**
    - **Why this file?**: It is the REST endpoint specialized for OCPP 1.6 Remote Start. It validates the incoming HTTP request before passing it to the internal module.
4.  **Module Logic**: **[EVDriver/module.ts](file:///opt/csms/citrineos-core/03_Modules/EVDriver/src/module/module.ts)**
    - **Logic**: It looks up the charging station configuration and constructs an internal `IMessage` object.
5.  **Messaging**: The message is published to **RabbitMQ**.
6.  **Router**: The `OcppRouter` (inside `csms-core`) handles the final step of converting the internal message into raw OCPP bytes and sending them to the Charger via WebSocket.

---

## 🚀 Future Upgrades: How to Evolve the UI

To maintain and improve the UI, follow these structured paths:

### 1. Adding New Telemetry (e.g., Range, Cost)
1. **Database**: Identify the new measurand in the `MeterValues` table in PostgreSQL.
2. **GraphQL Query**: Update `GET_STATION_DETAILS` in `src/lib/queries.ts` if a new table or field is required.
3. **UI Logic**: Update the `fetchTelemetry` loop in `page.tsx` to parse the new measurand from the `sampledValue` array.
4. **Component**: Add a new `DataCard` or update `vehicle-data-card.tsx` to display the metric.

### 2. UI Component Redesign
- Leverage **Tailwind CSS 4** for styling.
- Components are located in `src/components/`. Use modern React patterns (Hooks, functional components).
- For complex tables or forms, refer to the **Refine** documentation (CitrineOS uses `@refinedev/core`).

### 3. Dependency Updates
- Run `npm outdated` to check for newer versions of Next.js or Refine.
- Always check the **Next.js Migration Guide** when upgrading major versions (e.g., from v16 to v17).

---

### How to Start/Stop the UI Container
- **Startup**: `docker-compose -f docker-compose-user-ui.yml up -d`
- **Rebuild**: `docker-compose -f docker-compose-user-ui.yml up -d --build`
- **Stop**: `docker-compose -f docker-compose-user-ui.yml down`

---

*This guide serves as the foundation for the CitrineOS User UI. For deeper API documentation, refer to the [CitrineOS Core README](file:///opt/csms/citrineos-core/README.md).*
