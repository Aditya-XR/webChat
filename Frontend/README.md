# WebChat Frontend

React 19 + Vite client for WebChat. Features, architecture, the API, and full setup instructions are in the [root README](../README.md).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server at http://localhost:5173 |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Environment

Create `Frontend/.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes | Backend base URL for API calls and Socket.IO, e.g. `http://localhost:5000` |
| `VITE_GOOGLE_CLIENT_ID` | For Google sign-in | Google OAuth Web Client ID used by Google Identity Services |

## Layout

- `context/AuthContext.jsx`: session, Axios defaults and loader interceptors, Socket.IO connection
- `context/ChatContext.jsx`: contacts, invites, messages, unread counts, socket event handlers
- `src/pages/`: Home, Login, Profile, and VerifyEmail screens
- `src/components/`: contact sidebar, chat window, profile sidebar, Google sign-in button, global loader
- `vercel.json`: rewrites every path to `index.html` so client-side routes such as `/verify-email` work on reload
