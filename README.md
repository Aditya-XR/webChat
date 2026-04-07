# 💬 WebChat

WebChat is a full-stack real-time messaging platform built with React, Express, MongoDB, and Socket.IO. It combines credential-based authentication, Google OAuth 2.0 sign-in, profile management, image sharing, unread message tracking, and live online presence into a clean split frontend/backend architecture.

The project is structured like a production web app rather than a demo-only SPA: the frontend is a Vite-powered client, the backend exposes versioned REST APIs, authentication is JWT-based, media is handled through Cloudinary, and real-time updates are delivered through WebSockets.

## 🚀 Features

- Real-time one-to-one messaging with Socket.IO-powered delivery
- Email/password authentication with bcrypt password hashing
- Google OAuth 2.0 login with account linking for existing users
- JWT-based session management with access and refresh tokens
- Profile management with editable name, bio, and avatar
- Media messaging with image upload support
- Unread message counters and automatic seen-state updates
- Online presence indicators driven by socket connection state
- Searchable conversation sidebar
- Protected routes and staged onboarding for newly created accounts
- Frontend loading overlay for in-flight API requests
- Split deployment model for independent frontend and backend hosting

## 🛠 Tech Stack

### Frontend
- React 19
- React Router
- Vite
- Tailwind CSS
- Axios
- Socket.IO Client
- React Hot Toast
- Lottie React

### Backend
- Node.js
- Express 5
- Socket.IO
- JWT (`jsonwebtoken`)
- bcrypt
- Multer
- Google Auth Library

### Database & Media
- MongoDB
- Mongoose
- Cloudinary

### Tooling & Deployment
- ESLint
- Nodemon
- Vercel

## 🏗 Architecture

### Backend Architecture
The backend follows a lightweight MVC-style structure:

- `routes/` define the public HTTP API surface
- `controllers/` implement request validation and business logic
- `models/` define MongoDB schemas and indexes
- `middleware/` handles auth, uploads, and timeouts
- `utils/` centralize response wrappers, Cloudinary uploads, and error helpers

Typical request flow:

`Client -> Express Route -> Middleware -> Controller -> Mongoose Model -> MongoDB -> JSON Response`

### Frontend Architecture
The frontend uses React Context as its application-level state layer:

- `AuthContext` manages authentication, token persistence, session restoration, logout, profile updates, and socket connection bootstrap
- `ChatContext` manages users, active conversation, unread counts, message retrieval, and optimistic message insertion

This keeps view components focused on rendering and user interaction while the contexts own network orchestration.

### Real-Time Messaging Flow

1. The authenticated client connects to Socket.IO with its user ID.
2. The backend maps `userId -> socketId`.
3. When a message is sent, it is first persisted in MongoDB.
4. If the recipient is online, the backend emits `newMessage` to the matching socket.
5. The client updates unread counts or appends the message directly if the conversation is open.

This design ensures messages remain durable even if the recipient is offline.

## 📂 Project Structure

```text
webChat/
├── Frontend/
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ChatContext.jsx
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── package.json
│   └── vercel.json
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── constants.js
│   │   ├── server.js
│   │   └── socket.js
│   ├── .env
│   ├── package.json
│   └── vercel.json
└── README.md
```

### Folder Responsibilities

- `Frontend/context` holds shared app state and API interaction logic
- `Frontend/src/pages` contains the main route-level screens
- `Frontend/src/components` contains reusable chat and auth UI pieces
- `Backend/src/controllers` contains user and messaging workflows
- `Backend/src/models` defines `User` and `Message` persistence logic
- `Backend/src/middleware` contains JWT auth, file upload, and timeout handling
- `Backend/src/socket.js` manages connection lifecycle and presence broadcasting

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/webChat.git
cd webChat
```

### 2. Install dependencies

```bash
cd Frontend
npm install
cd ../Backend
npm install
```

### 3. Configure environment variables

Create:

- `Frontend/.env`
- `Backend/.env`

Use the environment variable reference below.

### 4. Run the backend

```bash
cd Backend
npm run server
```

### 5. Run the frontend

```bash
cd Frontend
npm run dev
```

### 6. Open the app

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
```

## 🔐 Environment Variables

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes | Base URL for the backend API and Socket.IO connection |
| `VITE_GOOGLE_CLIENT_ID` | For Google login | Google OAuth Web Client ID used by Google Identity Services |

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | Yes | Express server port for local development |
| `MONGODB_URI` | Yes | MongoDB connection string prefix used with `webchat_db` |
| `CORS_ORIGIN` | Yes | Allowed frontend origin for API and socket access |
| `ACCESS_TOKEN_SECRET` | Yes | Secret used to sign access JWTs |
| `ACCESS_TOKEN_EXPIRY` | Yes | Access token lifetime, e.g. `1h` or `1d` |
| `REFRESH_TOKEN_SECRET` | Yes | Secret used to sign refresh JWTs |
| `REFRESH_TOKEN_EXPIRY` | Yes | Refresh token lifetime |
| `CLOUDINARY_CLOUD_NAME` | For image uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For image uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For image uploads | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID used to verify ID tokens on the server |

## 📡 API Overview

Base URL:

```text
/api/v1
```

### User Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/users/signUp` | Register a new user with email and password |
| `POST` | `/users/login` | Log in with email/password |
| `POST` | `/users/google` | Authenticate with Google OAuth 2.0 |
| `POST` | `/users/logout` | Clear refresh token and end session |
| `GET` | `/users/me` | Fetch the currently authenticated user |
| `PUT` | `/users/update-profile` | Update name, bio, and avatar |

### Messaging Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/messages/getUsers` | Fetch users for the conversation sidebar plus unread counts |
| `GET` | `/messages/messages/:id` | Fetch message history with a selected user |
| `PUT` | `/messages/mark-as-seen/:id` | Mark a message as seen |
| `POST` | `/messages/send-message/:id` | Send a text and/or image message |

## 📸 Screenshots

Add product screenshots here for a stronger GitHub presentation:

```md
![Login Screen](./docs/screenshots/login.png)
![Chat Dashboard](./docs/screenshots/chat-dashboard.png)
![Profile Page](./docs/screenshots/profile-page.png)
```

Recommended captures:

- Authentication screen
- Main chat layout
- Mobile responsive layout
- Profile editing flow
- Image messaging flow

## 🚀 Features Explained

### Authentication

WebChat supports two authentication paths:

- Traditional email/password signup and login
- Google OAuth 2.0 via Google Identity Services

Passwords are hashed with `bcrypt`, JWT access and refresh tokens are issued on login, and protected routes rely on a `verifyJWT` middleware that accepts either cookies or `Authorization: Bearer <token>` headers. The frontend currently persists the access token in local storage to simplify SPA session restoration.

The Google auth flow is implemented as a popup-based login experience. The frontend obtains a Google ID token, sends it to the backend, and the backend verifies it using `google-auth-library`. If a matching email already exists, the account is linked rather than duplicated.

### Real-Time Messaging

Real-time updates are handled by Socket.IO. When a user connects, the backend stores their socket ID in an in-memory map and broadcasts the online user list. When a message is created, it is first stored in MongoDB and then emitted to the recipient if they are online.

This gives the system two important properties:

- messages are durable because persistence happens before emission
- the UI remains responsive because online/offline state is pushed in real time

### Database Design

The data model is intentionally compact:

- `User` stores identity, auth metadata, profile fields, and refresh token state
- `Message` stores sender, receiver, text, optional image URL, seen state, and timestamps

The `Message` schema also includes compound indexes for common query patterns:

- sender + receiver + createdAt
- receiver + sender + createdAt
- receiver + seen

These indexes support fast conversation retrieval and unseen message counts.

### Media Uploads

Profile images and chat images are received through `multer`, written to a temporary directory, uploaded to Cloudinary, and then removed from local disk. A dedicated timeout wrapper protects long-running uploads and returns a clear 408 response when an upload takes too long.

## 🧠 Design Decisions

### Why React Context instead of a heavier client state library?

The app has a focused state domain: authentication, current user, selected chat, messages, unread counts, and socket events. React Context keeps this state close to the app without adding Redux/Zustand-level complexity.

### Why JWT for auth?

JWTs make the frontend/backend split easy to manage across environments, especially when the frontend and backend are deployed independently. The backend also supports cookie-based token delivery, which leaves room for future hardening.

### Why Socket.IO?

Socket.IO provides a pragmatic real-time layer for chat applications:

- simple client/server integration
- connection lifecycle events
- event-driven messaging
- easier local development than raw WebSocket handling

### Why MongoDB + Mongoose?

Chat data is document-friendly, and MongoDB works well for user/message entities with evolving profile fields and lightweight relational needs. Mongoose adds schema validation, indexes, and model methods for tokens/password workflows.

### Why Cloudinary for media?

Offloading media storage keeps the backend stateless and avoids handling binary asset storage directly on the application server. It also simplifies CDN-friendly image delivery.

### Why separate frontend and backend apps?

A split deployment model improves portability and keeps responsibilities clean:

- frontend focuses on UX and client state
- backend focuses on auth, persistence, media, and real-time events

This mirrors how many production systems are deployed and maintained.

## 🔮 Future Improvements

- Move Socket.IO to a stateful production runtime or dedicated realtime service for full production-grade WebSocket support beyond serverless constraints
- Add message pagination and virtualized chat history for large conversations
- Introduce refresh-token rotation and stronger cookie-first auth for improved browser security
- Add typing indicators and delivery/read receipts at the conversation level
- Add user blocking, account linking management, and password reset flows
- Add conversation metadata and last-message snapshots to reduce sidebar query cost
- Add automated tests for auth, messaging, and upload flows
- Add observability for API latency, upload failures, and socket lifecycle events
- Add a stable avatar synchronization strategy for third-party OAuth profile images

## ⭐ Support

If you found this project useful:

- star the repository
- open an issue for bugs or feature suggestions
- fork it and extend the platform

If you are a recruiter or engineer reviewing the project, the most relevant files to inspect first are:

- `Frontend/context/AuthContext.jsx`
- `Frontend/context/ChatContext.jsx`
- `Backend/src/controllers/user.controller.js`
- `Backend/src/controllers/message.controller.js`
- `Backend/src/socket.js`
