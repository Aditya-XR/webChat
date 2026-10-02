# WebChat

WebChat is a full-stack, real-time one-to-one chat app. A React 19 + Vite client talks to an Express 5 REST API and a Socket.IO server backed by MongoDB. It supports email/password sign-up with email verification, Google sign-in with account linking, contact invites and blocking, image messages via Cloudinary, unread counts, read receipts, and live online presence.

The frontend (`Frontend/`) and backend (`Backend/`) are separate apps that communicate over a versioned REST API (`/api/v1`) and WebSockets.

## Highlights

- **Persist, then emit.** `sendMessage` checks that the two users are accepted, unblocked contacts and saves the message to MongoDB before emitting `newMessage` to the recipient's socket. Offline recipients miss nothing: history and unread counts are read from the database.
- **Presence and read receipts.** An in-memory `userId -> socketId` map drives the `online-users` broadcast and targeted emits. Opening a chat marks incoming messages as seen with one `updateMany` and notifies the sender (`messagesSeenAll`), whose ticks switch to "seen".
- **Google sign-in with account linking.** The Google ID token is verified on the server (audience check, `email_verified` required). Users are matched by `googleId`, then by email to link an existing password account; an email already linked to a different Google account gets a 409.
- **Single-use email links.** Verification and email-change links are signed JWTs with a `purpose` claim, and the token is also stored on the user, so only the latest link works, and only once. The old address stays active until the new one is confirmed.
- **Indexes shaped to the queries.** `Message` has compound indexes `{ senderId, receiverId, createdAt }` and `{ receiverId, senderId, createdAt }` for the two directions of a conversation, plus `{ receiverId, seen }` for unread counts. `Contact` has a unique `{ requester, recipient }` index.

## Features

- One-to-one messaging with real-time delivery over Socket.IO, optimistic sends, and a "failed" state on errors
- Email/password sign-up with bcrypt password hashing and required email verification
- Google sign-in (Google Identity Services) with account linking for existing users
- JWT access tokens, read from an `Authorization: Bearer` header or an httpOnly cookie
- Contact invites: search users by name or email, then send, accept, decline, or cancel invites
- Blocking and unblocking, enforced on the server
- Image messages and profile pictures stored on Cloudinary, with upload timeouts
- Delete-for-everyone on your own messages, synced live to both users
- Per-contact unread counts, read receipts, and online/offline presence
- Profile editing (name, bio, avatar) and email-address changes confirmed by email
- Protected routes and a profile-completion step for new Google accounts
- Loading overlay driven by Axios interceptors

## Tech Stack

### Frontend
- React 19
- React Router
- Vite
- Tailwind CSS
- Axios
- Socket.IO Client
- Google Identity Services
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
- Nodemailer

### Database & Media
- MongoDB
- Mongoose
- Cloudinary

### Tooling
- ESLint
- Nodemon
- Vercel SPA rewrite config for the frontend (`Frontend/vercel.json`)

## Architecture

### Backend Architecture
The backend follows a lightweight MVC-style structure:

- `routes/` define the HTTP API (`/api/v1/users`, `/api/v1/messages`, `/api/v1/contacts`)
- `controllers/` implement request validation and business logic
- `models/` define the Mongoose schemas and indexes (`User`, `Message`, `Contact`)
- `middleware/` handles JWT auth, the verified-email guard, Multer uploads, and request timeouts
- `utils/` holds the `ApiError`/`ApiResponse` wrappers, Cloudinary uploads, email sending, and startup backfills

Typical request flow:

`Client -> Express Route -> Middleware -> Controller -> Mongoose Model -> MongoDB -> JSON Response`

A central error handler turns thrown `ApiError`s into a consistent JSON shape (`success`, `message`, `errors`). On startup, after connecting to MongoDB, the server runs two backfills for older data: users without an `isVerified` field are marked verified, and an accepted `Contact` is created for every pair of users who already exchanged messages.

### Frontend Architecture
The frontend uses React Context as its application-level state layer:

- `AuthContext` owns the session: token persistence, session restore via `/users/me`, login and sign-up, Google sign-in, logout, profile and email updates, the Socket.IO connection, and the global loader
- `ChatContext` owns chat state: contacts, unread counts, pending invites, the active conversation, optimistic sends and deletes, and the socket event subscriptions

View components stay focused on rendering and user interaction while the contexts own network calls.

### Real-Time Messaging Flow

1. After login, the client opens a Socket.IO connection and passes its user ID in the handshake query.
2. The backend maps `userId -> socketId` and broadcasts the list of online users.
3. When a message is sent, the backend checks the contact relationship and persists the message in MongoDB.
4. If the recipient is online, the backend emits `newMessage` to their socket.
5. If that conversation is open, the client appends the message and marks it seen (the sender receives `messageSeen`); otherwise it increments the unread count.

Because persistence happens before emission, an offline recipient still gets every message: it is loaded from MongoDB when they open the conversation.

## Project Structure

```text
webChat/
├── Backend/
│   ├── src/
│   │   ├── controllers/   # user, message, contact
│   │   ├── database/      # MongoDB connection
│   │   ├── middleware/    # JWT auth, verified-email guard, uploads, timeouts
│   │   ├── models/        # User, Message, Contact
│   │   ├── routes/
│   │   ├── utils/         # API wrappers, Cloudinary, email, backfills
│   │   ├── constants.js
│   │   ├── server.js      # Express app, CORS, routes, error handler
│   │   └── socket.js      # Socket.IO server and presence map
│   └── package.json
├── Frontend/
│   ├── context/           # AuthContext, ChatContext
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/    # Sidebar, ChatContainer, RightSidebar, Google button, loader
│   │   ├── lib/
│   │   ├── pages/         # Home, Login, Profile, VerifyEmail
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json        # SPA rewrite to index.html
└── README.md
```

Each app reads its configuration from a local, git-ignored `.env` file (see [Environment Variables](#environment-variables)).

## Installation & Setup

Prerequisites: Node.js `^20.19.0` or `>=22.12.0` (required by Vite 7 and Mongoose 9) and a MongoDB instance, local or Atlas.

### 1. Clone the repository

```bash
git clone https://github.com/Aditya-XR/webChat.git
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

Create `Backend/.env` and `Frontend/.env` using the [reference below](#environment-variables). A minimal local setup needs `MONGODB_URI`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `EMAIL_USER`, and `EMAIL_PASS` in the backend, and `VITE_BACKEND_URL=http://localhost:5000` in the frontend.

Email/password sign-up sends a verification email and is rolled back if the email cannot be sent, so it needs working Gmail credentials (`EMAIL_PASS` is a Gmail app password). Google sign-in works without them.

### 4. Run the backend

```bash
cd Backend
npm run dev
```

`npm run dev` runs the server under nodemon; `npm start` runs it with plain Node.

### 5. Run the frontend

```bash
cd Frontend
npm run dev
```

### 6. Open the app

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000   (health check: GET /api/status)
```

## Environment Variables

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes | Backend base URL, used for API calls and the Socket.IO connection |
| `VITE_GOOGLE_CLIENT_ID` | For Google sign-in | Google OAuth Web Client ID used by Google Identity Services; without it the login page shows a notice instead of the Google button |

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string without a database name or query string; the app appends `/webchat_db` |
| `ACCESS_TOKEN_SECRET` | Yes | Signs access tokens and email verification links |
| `REFRESH_TOKEN_SECRET` | Yes | Signs the refresh token issued on every login |
| `PORT` | No | Server port (default `5000`) |
| `ACCESS_TOKEN_EXPIRY` | No | Access token lifetime (default `1d`) |
| `REFRESH_TOKEN_EXPIRY` | No | Refresh token lifetime (default `1h`) |
| `FRONTEND_URL` | No | Frontend origin used in email links (default `http://localhost:5173`); also added to the CORS allowlist |
| `CORS_ORIGIN` | No | Extra allowed origins, comma-separated; `http://localhost:5173` and `http://127.0.0.1:5173` are always allowed |
| `EMAIL_USER` | For email sign-up | Gmail address that sends verification and email-change links |
| `EMAIL_PASS` | For email sign-up | Gmail app password for `EMAIL_USER` |
| `EMAIL_VERIFICATION_TOKEN_EXPIRY` | No | Sign-up verification link lifetime (default `24h`) |
| `EMAIL_UPDATE_TOKEN_EXPIRY` | No | Email-change link lifetime (default `24h`) |
| `CLOUDINARY_CLOUD_NAME` | For image uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For image uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For image uploads | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | For Google sign-in | Google OAuth client ID used to verify ID tokens on the server |

## API Overview

Base URL:

```text
/api/v1
```

All routes except sign-up, login, Google sign-in, and email verification require an access token. The `/messages` routes also require a verified email. `GET /api/status` is an unauthenticated health check.

### User Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/users/signUp` | Register with email and password and send a verification email |
| `POST` | `/users/verify-email` | Confirm a sign-up or email-change link token |
| `POST` | `/users/login` | Log in with email and password (verified accounts only) |
| `POST` | `/users/google` | Sign in with a Google ID token, creating or linking the account |
| `POST` | `/users/logout` | End the session and clear the auth cookies |
| `GET` | `/users/me` | Fetch the currently authenticated user |
| `PUT` | `/users/update-profile` | Update name, bio, and avatar (multipart field `profilePic`) |
| `POST` | `/users/request-email-change` | Send a confirmation link to a new email address |

### Messaging Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/messages/getUsers` | Contacts for the sidebar (accepted or blocked) plus unread counts |
| `GET` | `/messages/messages/:id` | Conversation history with a user; marks their messages to you as seen |
| `PUT` | `/messages/mark-as-seen/:id` | Mark a single message as seen |
| `POST` | `/messages/send-message/:id` | Send text and/or an image (multipart field `image`) to an accepted contact |
| `PUT` | `/messages/delete-message/:id` | Delete your own message for everyone |

### Contact Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/contacts/search?q=` | Search verified users by name or email, with your relationship status |
| `GET` | `/contacts/requests` | Incoming and outgoing pending invites |
| `POST` | `/contacts/invite/:recipientId` | Send an invite (accepts theirs if they already invited you) |
| `PUT` | `/contacts/accept/:contactId` | Accept an invite |
| `DELETE` | `/contacts/reject/:contactId` | Decline an incoming invite or cancel an outgoing one |
| `POST` | `/contacts/block/:userId` | Block a user |
| `POST` | `/contacts/unblock/:userId` | Unblock a user you blocked |
| `GET` | `/contacts/blocked` | List the users you blocked |

### Socket.IO Events (server to client)

| Event | Sent when |
| --- | --- |
| `online-users` | A user connects or disconnects |
| `newMessage` | You receive a message |
| `messageSeen`, `messagesSeenAll` | The recipient has read one or all of your messages |
| `messageDeleted` | A message in your conversation was deleted |
| `contactRequestReceived`, `contactRequestAccepted`, `contactRequestRejected` | An invite is sent, accepted, declined, or cancelled |
| `contactBlocked`, `contactUnblocked` | Block state changes |

## Features Explained

### Authentication

WebChat supports two sign-in paths:

- Email/password sign-up and login
- Google sign-in via Google Identity Services

Passwords are hashed with bcrypt. New email/password accounts start unverified: sign-up emails a verification link, login is refused until the link is used, and the `/messages` routes are guarded by a `requireVerifiedUser` middleware. Signing up again with an unverified email refreshes the account details and sends a new link; if the email cannot be sent, the change is rolled back.

On login the server issues a JWT access token and a refresh token; the refresh token is stored on the user document, and both are also set as httpOnly cookies. Protected routes use a `verifyJWT` middleware that reads the access token from the `accessToken` cookie or an `Authorization: Bearer` header and tells expired tokens apart from invalid ones. The frontend keeps the access token in local storage and restores the session on load via `/users/me`. There is no refresh endpoint yet, so when the access token expires the user signs in again.

The Google flow uses a popup: the frontend obtains a Google ID token, the backend verifies it with `google-auth-library`, and the account is then found, linked, or created as described in [Highlights](#highlights). New Google users finish a short profile step (a bio) before reaching the chat.

### Real-Time Messaging

The Socket.IO server keeps an in-memory `userId -> socketId` map. Connects and disconnects update the map and broadcast `online-users`; messages, read receipts, deletions, and contact changes are emitted only to the sockets of the users involved.

On the client, sends are optimistic: a temporary message appears immediately in a "sending" state and is replaced by the saved message, or marked "failed", when the API responds. Deletes are optimistic too and roll back on error. Ticks show sent, delivered (recipient currently online), and seen.

### Contacts and Blocking

Users can only message accepted contacts. Each relationship is a `Contact` document with a `pending`, `accepted`, `rejected`, or `blocked` status and a `blockedBy` field, and a `findRelationship` static looks it up in either direction. If two users invite each other, the second invite accepts the first. A user can be blocked with or without an existing contact, and only the user who blocked can unblock. `sendMessage` enforces these rules on the server, not just in the UI.

### Database Design

- `User` stores identity, the bcrypt password hash (null for Google-only accounts), `googleId`, profile fields, the current refresh token, and email-verification state (`isVerified`, `verificationToken`, `pendingEmail`, `emailUpdateToken`)
- `Message` stores sender, receiver, text, optional image URL, `seen`, soft-delete fields (`isDeleted`, `deletedAt`, `deletedBy`), and timestamps; a `pre('validate')` hook rejects messages that have neither text nor an image
- `Contact` stores requester, recipient, status, `blockedBy`, and timestamps; `updatedAt` is bumped on every message so recent conversations sort first

Indexes:

- `Message`: `{ senderId: 1, receiverId: 1, createdAt: 1 }` and `{ receiverId: 1, senderId: 1, createdAt: 1 }` for conversation history in either direction, and `{ receiverId: 1, seen: 1 }` for unread counts
- `Contact`: unique `{ requester: 1, recipient: 1 }`, plus single-field indexes on `requester`, `recipient`, and `status`
- `User`: unique `email` and unique, sparse `googleId`

### Media Uploads

Profile pictures and chat images are received by Multer into a temporary directory, uploaded to Cloudinary, and deleted from local disk whether or not the upload succeeds. Each Cloudinary upload is raced against a 15-second timeout and fails with a 408 and a clear message. The send-message route also has a request-timeout middleware that answers 408 after 15 seconds; the controller then checks a `req.isTimedOut()` flag so it does not save the message (if the timeout hit during the upload) or broadcast it (if the timeout hit during the save).

## Design Decisions

### Why React Context instead of a heavier client state library?

The state is focused: the session, contacts, the open conversation, messages, unread counts, and socket events. Two contexts cover it without adding Redux or Zustand.

### Why JWT for auth?

Tokens work well when the frontend and backend are hosted separately. The backend already sets httpOnly cookies alongside the Bearer token, which leaves room to move the browser session to cookies only.

### Why Socket.IO?

It provides connection lifecycle events, targeted emits to a specific socket, automatic reconnection, and a polling fallback, with simple client and server APIs.

### Why MongoDB + Mongoose?

Users, messages, and contacts map naturally to documents. Mongoose adds schema validation, indexes, hooks, and model methods for password checks, token generation, and relationship lookups.

### Why Cloudinary for media?

It keeps binary files off the application server and serves images from a CDN.

### Why separate frontend and backend apps?

The client and the API can be developed, configured, and deployed independently: the frontend only needs `VITE_BACKEND_URL`, and the backend controls which origins may call it.

## Future Improvements

- Authenticate the Socket.IO handshake with the access token instead of trusting the `userId` query parameter
- Add a token refresh endpoint with refresh-token rotation, and keep the browser session in httpOnly cookies instead of local storage
- Run the backend on a host that supports long-lived WebSocket connections, and move presence out of process so it can scale past one instance
- Paginate message history and virtualize long conversations
- Compute sidebar unread counts with one aggregation instead of one query per contact
- Add typing indicators and server-confirmed delivery receipts
- Add a password reset flow
- Add automated tests for auth, messaging, contacts, and uploads

## Where to Start Reading

If you are reviewing the code, these files show the most:

- `Backend/src/controllers/user.controller.js`: sign-up, email verification, Google account linking, token issuance
- `Backend/src/controllers/contact.controller.js`: invites and blocking
- `Backend/src/controllers/message.controller.js`: persistence, read receipts, deletion, real-time emits
- `Backend/src/socket.js`: Socket.IO server and presence map
- `Frontend/context/AuthContext.jsx`: session, Axios setup, socket connection
- `Frontend/context/ChatContext.jsx`: chat state, optimistic updates, socket event handlers
