import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import type { Express } from 'express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vinyl Catalog API',
      version: '1.0.0',
      description: 'API documentation for Vinyl Catalog',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // read jsdoc from route files
}

const specs = swaggerJsdoc(options)

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))
}
