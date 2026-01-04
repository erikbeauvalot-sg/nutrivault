/**
 * Swagger API Documentation Configuration
 *
 * OpenAPI 3.0 specification for NutriVault API
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NutriVault API',
      version: '1.0.0',
      description: 'Secure nutrition practice management system API documentation',
      contact: {
        name: 'NutriVault Support',
        email: 'support@nutrivault.local'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.nutrivault.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token for authentication'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for programmatic access'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            username: {
              type: 'string',
              example: 'john.doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            first_name: {
              type: 'string',
              example: 'John'
            },
            last_name: {
              type: 'string',
              example: 'Doe'
            },
            role_id: {
              type: 'string',
              format: 'uuid'
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            last_login_at: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Patient: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            first_name: {
              type: 'string',
              example: 'Jane'
            },
            last_name: {
              type: 'string',
              example: 'Smith'
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              example: '1985-06-15'
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
              example: 'FEMALE'
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true
            },
            phone: {
              type: 'string',
              nullable: true
            },
            address: {
              type: 'string',
              nullable: true
            },
            city: {
              type: 'string',
              nullable: true
            },
            postal_code: {
              type: 'string',
              nullable: true
            },
            country: {
              type: 'string',
              nullable: true
            },
            medical_notes: {
              type: 'string',
              nullable: true
            },
            dietary_preferences: {
              type: 'string',
              nullable: true
            },
            allergies: {
              type: 'string',
              nullable: true
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            assigned_dietitian_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['first_name', 'last_name', 'date_of_birth']
        },
        Visit: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            patient_id: {
              type: 'string',
              format: 'uuid'
            },
            dietitian_id: {
              type: 'string',
              format: 'uuid'
            },
            visit_date: {
              type: 'string',
              format: 'date-time'
            },
            duration_minutes: {
              type: 'integer',
              minimum: 5,
              maximum: 480,
              example: 60
            },
            visit_type: {
              type: 'string',
              enum: ['INITIAL_CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ONLINE', 'IN_PERSON'],
              example: 'FOLLOW_UP'
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
              example: 'COMPLETED'
            },
            chief_complaint: {
              type: 'string',
              nullable: true
            },
            assessment: {
              type: 'string',
              nullable: true
            },
            recommendations: {
              type: 'string',
              nullable: true
            },
            next_visit_date: {
              type: 'string',
              format: 'date',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['patient_id', 'visit_date', 'duration_minutes', 'visit_type']
        },
        Billing: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            patient_id: {
              type: 'string',
              format: 'uuid'
            },
            visit_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            invoice_number: {
              type: 'string',
              example: 'INV-2024-000001'
            },
            invoice_date: {
              type: 'string',
              format: 'date'
            },
            due_date: {
              type: 'string',
              format: 'date'
            },
            amount: {
              type: 'number',
              format: 'float',
              example: 150.00
            },
            tax_amount: {
              type: 'number',
              format: 'float',
              example: 15.00
            },
            total_amount: {
              type: 'number',
              format: 'float',
              example: 165.00
            },
            currency: {
              type: 'string',
              example: 'USD'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'],
              example: 'PAID'
            },
            payment_method: {
              type: 'string',
              enum: ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER'],
              nullable: true
            },
            payment_date: {
              type: 'string',
              format: 'date',
              nullable: true
            },
            notes: {
              type: 'string',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['patient_id', 'invoice_date', 'due_date', 'amount']
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Invalid or expired token'
                },
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions'
                },
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found'
                },
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and API key management'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Patients',
        description: 'Patient management operations'
      },
      {
        name: 'Visits',
        description: 'Visit and appointment management'
      },
      {
        name: 'Billing',
        description: 'Billing and invoice management'
      },
      {
        name: 'Audit',
        description: 'Audit log and reporting'
      }
    ]
  },
  apis: ['./src/routes/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
