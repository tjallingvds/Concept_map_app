import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './index.css';
import App from './App.tsx';
import { Auth0Provider } from '@auth0/auth0-react';
import config from './auth_config.json';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Auth0Provider
            domain={config.domain}
            clientId={config.clientId}
            authorizationParams={{
                redirect_uri: window.location.origin,
                audience: config.audience,
                scope: "openid profile email offline_access",
            }}
            cacheLocation="localstorage"
            useRefreshTokens={true}
        >
            <App />
            <Toaster position="top-right" />
        </Auth0Provider>
    </StrictMode>
);
