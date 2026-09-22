# Development JWT keys

`dev-private.pem` and `dev-public.pem` are an RSA key pair for local development and automated tests only.
Deployments must provide their own key locations through `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`.
Never reuse or distribute this development private key in a production environment.
