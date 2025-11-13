# Petstore API

TypeScript backend implementation of the Petstore API based on OpenAPI 3.0 specification.

## Tech Stack

- **Node.js**: v22 LTS
- **TypeScript**: Strict mode
- **Framework**: Fastify
- **ORM**: Prisma
- **Database**: SQLite (dev/test), PostgreSQL (production)
- **Validation**: Fastify JSON Schema
- **Testing**: Jest with ts-jest
- **Code Quality**: ESLint + Prettier

## Prerequisites

- Node.js 22 or higher
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Create a `.env` file in the root directory:

```bash
NODE_ENV=development
PORT=13000
DATABASE_URL="file:./dev.db"
```

### 3. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:13000`

## Swagger UI Documentation

Interactive API documentation is available via Swagger UI at:

**`http://localhost:13000/docs`**

The Swagger UI provides:
- Interactive API exploration
- Try-it-out functionality for all endpoints
- Request/response examples
- Schema definitions
- Authentication testing (when implemented)

You can also access the OpenAPI JSON specification at:
- `http://localhost:13000/docs/json`

## API Endpoints

### Health Check
- `GET /health` - Check server and database health
- `GET /` - API information

### Pets
- `POST /pet` - Create a new pet
- `PUT /pet` - Update an existing pet
- `GET /pet/findByStatus?status=available` - Find pets by status
- `GET /pet/:petId` - Get pet by ID
- `DELETE /pet/:petId` - Delete a pet

### Categories
- `GET /category` - Get all categories
- `GET /category/:categoryId` - Get category by ID
- `POST /category` - Create a new category
- `PUT /category/:categoryId` - Update a category
- `DELETE /category/:categoryId` - Delete a category

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

### Database
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed the database
- `npm run db:reset` - Reset database (drop all data)

### OpenAPI
- `npm run openapi:types` - Generate TypeScript types from OpenAPI spec
- `npm run openapi:generate` - Generate client SDK from OpenAPI spec

### Testing
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Code Quality
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Type check without emitting

## Project Structure

```
├── src/
│   ├── controllers/       # Route handlers
│   ├── services/         # Business logic
│   ├── routes/           # Route definitions
│   ├── schemas/          # Validation schemas
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities (error handling, logger)
│   └── index.ts          # Application entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeding
├── tests/                # Test files
├── openapi/
│   └── petstore.yml      # OpenAPI specification
├── generated/            # Generated OpenAPI client
└── scripts/              # Utility scripts
```

## Error Response Format

All errors follow a consistent format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}
}
```

## Development Guidelines

### Code Style
- Follow TypeScript strict mode
- Use explicit types, avoid `any`
- Single responsibility principle
- Prefer async/await over promises
- Use Prettier formatting
- Follow ESLint rules

### Validation
- All inputs validated using Fastify JSON Schema
- Business logic validation in service layer
- Consistent error responses

### Error Handling
- Use custom error classes (NotFoundError, ValidationError, etc.)
- Centralized error handler
- Log all errors
- Don't expose sensitive information in production

### Database
- Use Prisma migrations for schema changes
- Always include transactions for multi-step operations
- Use proper indexes for performance
- Validate foreign key relationships

## Production Deployment

### Environment Variables

```bash
NODE_ENV=production
PORT=13000
DATABASE_URL="postgresql://user:password@host:5432/database"
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15 minutes
```

### Build and Deploy

```bash
# Build
npm run build

# Run migrations
npm run prisma:migrate:prod

# Start server
npm start
```

## Testing

Run tests with:

```bash
npm test
```

Tests include:
- Unit tests for services
- Integration tests for API endpoints
- Contract tests against OpenAPI spec

## Security

- Helmet for security headers
- CORS configuration
- Rate limiting
- Input validation and sanitization
- SQL injection prevention (Prisma parameterized queries)
- Environment variable protection

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
