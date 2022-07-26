clean:
	rm -rf frontend/public/

dev-frontend:
	cd frontend && hugo server

dev-backend:
	cd backend && PORT=1314 ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:1313 npx -y nodemon server.js

dev:
	make -j2 dev-frontend dev-backend

build: clean
	cd frontend && hugo