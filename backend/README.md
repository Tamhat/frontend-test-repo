<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Audit Vault Backend

NestJS backend API for the Audit Vault compliance document management system.

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (Passport)
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer

## Prerequisites

- Node.js (v18 or higher)
- npm
- Docker and Docker Compose (for local database)

## Project Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Start the PostgreSQL database using Docker Compose:

```bash
docker compose up -d db
```

This will start a PostgreSQL 15 container with the following default configuration:

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `audit_vault`
- **User**: `audit_admin`
- **Password**: `secure_password`

### 3. Environment Variables

Create a `.env` file in the `backend` directory (optional for local development, as defaults are provided in `docker-compose.yml`):

```env
DATABASE_URL="postgresql://audit_admin:secure_password@localhost:5432/audit_vault?schema=public"
PORT=3000
JWT_SECRET="your-jwt-secret-key-change-in-production"
```

### 4. Database Migrations

Generate Prisma Client and run migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (for development)
npx prisma migrate dev

# if the login credentials aren't working for you please run the following:
npx prisma db seed

# Or if migrations are already applied and you just need to sync:
npx prisma migrate deploy
```

**Note**: `prisma migrate dev` will create a new migration if the database is not in sync. `prisma migrate deploy` applies existing migrations without creating new ones (useful for production or when migrations already exist).

### 5. Seed the Database (Optional)

Populate the database with sample data including test users, funds, and documents:

```bash
npx prisma db seed
```

The seed script creates test accounts with the following credentials:

- **Admin**: `admin@auditvault.com` / `password123`
- **Fund Manager**: `manager@funds.com` / `password123`
- **Auditor**: `auditor@auditvault.com` / `password123`
- **Compliance Officer**: `compliance@auditvault.com` / `password123`

## Running the Application

### Development Mode

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

### Production Mode

```bash
npm run build
npm run start:prod
```

### Watch Mode (Development)

```bash
npm run start:dev
```

## API Documentation

Once the server is running, access the Swagger API documentation at:

**http://localhost:3000/api**

The Swagger UI provides an interactive interface to explore and test all API endpoints.

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in watch mode (development)
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run build` - Build the application
- `npm run format` - Format code with Prettier
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## Database Management

### Prisma Studio (Database GUI)

Launch Prisma Studio to visually browse and edit your database:

```bash
npx prisma studio
```

This will open a web interface at `http://localhost:5555`.

### Reset Database

To reset the database (⚠️ **Warning**: This will delete all data):

```bash
npx prisma migrate reset
```

### Create New Migration

After modifying the Prisma schema:

```bash
npx prisma migrate dev --name your_migration_name
```

### Generate Prisma Client

After schema changes:

```bash
npx prisma generate
```

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Database seeding script
│   └── migrations/         # Database migrations
├── src/
│   ├── auth/               # Authentication module
│   ├── documents/          # Document management
│   ├── funds/              # Fund management
│   ├── users/              # User management
│   ├── audit/              # Audit trail
│   ├── chat/               # Chat functionality
│   ├── storage/            # File storage service
│   └── main.ts             # Application entry point
├── docker-compose.yml      # Docker configuration for database
└── package.json
```

## API Endpoints

The main API endpoints include:

- **Authentication**: `/auth/login`, `/auth/register`
- **Documents**: `/documents` (CRUD operations)
- **Funds**: `/funds` (CRUD operations)
- **Users**: `/users` (User management)
- **Audit**: `/audit` (Audit trail queries)
- **Chat**: `/chat` (Chat sessions and messages)

See the Swagger documentation at `/api` for complete endpoint details.

## Stopping the Application

1. Stop the server: Press `Ctrl+C` in the terminal
2. Stop the database:

   ```bash
   docker compose down
   ```

   To also remove the database volumes:

   ```bash
   docker compose down -v
   ```
