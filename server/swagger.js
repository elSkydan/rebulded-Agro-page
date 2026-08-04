'use strict';

/**
 * server/swagger.js
 * Full OpenAPI 3.0 specification for the Agro Aggregator API.
 * Mounted at GET /api-docs by server.js.
 */

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Agro Aggregator API',
    description:
      'API for managing agricultural service leads, workers, and cities.\n\n' +
      '**Authentication:** Admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>` header.\n\n' +
      '**Public endpoints:** `POST /api/leads`, `POST /api/telegram/webhook`, `GET /health`.',
    version: '1.0.0',
  },
  servers: [
    {
      url: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
      description: 'Current server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Value of the ADMIN_TOKEN environment variable',
      },
    },
    schemas: {
      // ── Enums ─────────────────────────────────────────────────────────────
      ServiceType: {
        type: 'string',
        enum: ['ogorod', 'celina', 'mowing', 'tree', 'washing'],
        description: 'Type of agricultural service',
      },
      LeadStatus: {
        type: 'string',
        enum: [
          'new', 'assigned', 'accepted', 'rejected',
          'timeout', 'completed', 'canceled', 'unassigned', 'failed_contact',
        ],
      },
      EquipmentType: {
        type: 'string',
        enum: ['motoblock', 'tractor'],
      },
      DeliveryType: {
        type: 'string',
        enum: ['fixed', 'per_km'],
      },

      // ── City ──────────────────────────────────────────────────────────────
      City: {
        type: 'object',
        properties: {
          id:             { type: 'integer', example: 1 },
          name:           { type: 'string',  example: 'Kyiv' },
          delivery_type:  { $ref: '#/components/schemas/DeliveryType' },
          delivery_price: { type: 'number',  example: 200 },
          base_radius:    { type: 'number',  nullable: true, example: 10.5 },
          created_at:     { type: 'string',  format: 'date-time' },
        },
      },

      // ── Worker ────────────────────────────────────────────────────────────
      Worker: {
        type: 'object',
        properties: {
          id:               { type: 'integer', example: 1 },
          name:             { type: 'string',  example: 'Ivan Petrenko' },
          phone:            { type: 'string',  nullable: true, example: '+380671234567' },
          telegram_chat_id: { type: 'integer', example: 197656058 },
          city_id:          { type: 'integer', example: 1 },
          city_name:        { type: 'string',  example: 'Kyiv' },
          equipment_type:   { $ref: '#/components/schemas/EquipmentType' },
          is_active:        { type: 'boolean', example: true },
          priority:         { type: 'integer', example: 0 },
          last_assigned_at: { type: 'string',  format: 'date-time', nullable: true },
          created_at:       { type: 'string',  format: 'date-time' },
        },
      },

      // ── Lead (list item) ──────────────────────────────────────────────────
      LeadListItem: {
        type: 'object',
        properties: {
          id:               { type: 'integer', example: 42 },
          name:             { type: 'string',  nullable: true, example: 'Olena' },
          phone_normalized: { type: 'string',  example: '+380671234567' },
          service_type:     { $ref: '#/components/schemas/ServiceType' },
          area:             { type: 'number',  example: 5.5 },
          total_price:      { type: 'number',  example: 2750 },
          city_id:          { type: 'integer', example: 1 },
          status:           { $ref: '#/components/schemas/LeadStatus' },
          worker_id:        { type: 'integer', nullable: true, example: 3 },
          worker_name:      { type: 'string',  nullable: true, example: 'Ivan' },
          created_at:       { type: 'string',  format: 'date-time' },
          updated_at:       { type: 'string',  format: 'date-time' },
        },
      },

      // ── Lead (detail) ─────────────────────────────────────────────────────
      LeadDetail: {
        allOf: [
          { $ref: '#/components/schemas/LeadListItem' },
          {
            type: 'object',
            properties: {
              phone_raw:    { type: 'string',  example: '0671234567' },
              out_of_city:  { type: 'boolean', example: false },
              comment:      { type: 'string',  nullable: true, example: 'Near the forest' },
              city_name:    { type: 'string',  example: 'Kyiv' },
              worker_phone: { type: 'string',  nullable: true, example: '+380671234567' },
              assignment_history: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    worker_id:  { type: 'integer' },
                    status:     { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        ],
      },

      // ── Error ─────────────────────────────────────────────────────────────
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Not found' },
          code:  { type: 'string', example: 'INVALID_CITY' },
        },
      },
    },

    responses: {
      Unauthorized: {
        description: 'Missing or invalid Bearer token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Unauthorized', code: 'INVALID_TOKEN' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },

  // ── Paths ────────────────────────────────────────────────────────────────
  paths: {

    // ── Health ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Returns server and database status. Used by Render for health monitoring.',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                example: { status: 'ok', db: 'connected' },
              },
            },
          },
          503: {
            description: 'Database unreachable',
            content: {
              'application/json': {
                example: { status: 'error', db: 'unreachable' },
              },
            },
          },
        },
      },
    },

    // ── Leads ────────────────────────────────────────────────────────────────
    '/api/leads': {
      post: {
        tags: ['Leads'],
        summary: 'Submit a new lead (public)',
        description:
          'Public endpoint — rate-limited (5 req/min per IP).\n\n' +
          'Server calculates the price server-side. If a lead from the same phone exists ' +
          'within the spam window (10 min by default) and is not in a terminal status, ' +
          'it is updated and re-assigned rather than duplicated.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'service_type', 'area', 'city_id'],
                properties: {
                  name:         { type: 'string',  example: 'Olena' },
                  phone:        { type: 'string',  example: '0671234567', description: 'Any UA phone format — normalized to +380XXXXXXXXX' },
                  service_type: { $ref: '#/components/schemas/ServiceType' },
                  area:         { type: 'number',  example: 5.5, description: 'Area in sotka (0.5 – 50), rounded up to the nearest 0.5' },
                  city_id:      { type: 'integer', example: 1 },
                  out_of_city:  { type: 'boolean', default: false, description: 'Service requested outside city radius — applies extra charge' },
                  comment:      { type: 'string',  example: 'Gate code: 1234', description: 'Optional client note (max 1000 chars)' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Lead created and worker assignment attempted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    lead_id:         { type: 'integer', example: 42 },
                    total_price:     { type: 'number',  example: 2750 },
                    status:          { $ref: '#/components/schemas/LeadStatus' },
                    assigned:        { type: 'boolean', example: true },
                    assigned_worker: {
                      nullable: true,
                      type: 'object',
                      properties: {
                        id:   { type: 'integer' },
                        name: { type: 'string' },
                      },
                    },
                    message: { type: 'string', example: 'Lead received. A specialist will contact you shortly.' },
                  },
                },
              },
            },
          },
          422: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error:  { type: 'string', example: 'Validation failed' },
                    fields: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field:   { type: 'string', example: 'phone' },
                          message: { type: 'string', example: 'Invalid phone number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          429: { description: 'Rate limit exceeded' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },

      get: {
        tags: ['Leads'],
        summary: 'List leads (admin, paginated)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 },
            description: 'Max records to return',
          },
          {
            name: 'offset', in: 'query', schema: { type: 'integer', default: 0 },
            description: 'Pagination offset',
          },
          {
            name: 'status', in: 'query', schema: { $ref: '#/components/schemas/LeadStatus' },
            description: 'Filter by status',
          },
          {
            name: 'sort', in: 'query',
            schema: { type: 'string', enum: ['created_at_desc', 'created_at_asc'], default: 'created_at_desc' },
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of leads',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total:  { type: 'integer', example: 120 },
                    limit:  { type: 'integer', example: 50 },
                    offset: { type: 'integer', example: 0 },
                    data:   { type: 'array', items: { $ref: '#/components/schemas/LeadListItem' } },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/api/leads/debug/stats': {
      get: {
        tags: ['Leads'],
        summary: 'System stats snapshot (admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Quick counters for the dashboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total_leads:    { type: 'integer', example: 120 },
                    active_workers: { type: 'integer', example: 8 },
                    pending_leads:  { type: 'integer', example: 3 },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/api/leads/{id}': {
      get: {
        tags: ['Leads'],
        summary: 'Get lead by ID (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Lead detail with assignment history',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LeadDetail' } },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/api/leads/{id}/cancel': {
      patch: {
        tags: ['Leads'],
        summary: 'Cancel a lead (admin)',
        description: 'Allowed only when lead status is `new`, `assigned`, or `timeout`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Lead canceled',
            content: {
              'application/json': {
                example: { lead_id: 42, status: 'canceled' },
              },
            },
          },
          400: {
            description: 'Lead is in a non-cancelable status',
            content: {
              'application/json': {
                example: {
                  error: 'Cannot cancel a lead with status "completed". Allowed: new, assigned, timeout.',
                  code: 'INVALID_TRANSITION',
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ── Workers ──────────────────────────────────────────────────────────────
    '/api/workers': {
      get: {
        tags: ['Workers'],
        summary: 'List all workers (admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Array of workers',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Worker' } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },

      post: {
        tags: ['Workers'],
        summary: 'Create a worker (admin)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'city_id', 'telegram_chat_id'],
                properties: {
                  name:             { type: 'string',  example: 'Ivan Petrenko' },
                  city_id:          { type: 'integer', example: 1 },
                  telegram_chat_id: { type: 'integer', example: 197656058, description: 'Numeric Telegram chat_id — get via @userinfobot' },
                  phone:            { type: 'string',  example: '+380671234567' },
                  equipment_type:   { $ref: '#/components/schemas/EquipmentType' },
                  priority:         { type: 'integer', default: 0, description: 'Higher = served first in queue' },
                  is_active:        { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Worker created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Worker' } },
            },
          },
          400: { description: 'Missing required fields or invalid telegram_chat_id' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/api/workers/{id}': {
      patch: {
        tags: ['Workers'],
        summary: 'Update a worker (admin)',
        description: 'Partial update — only provided fields are changed.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:             { type: 'string' },
                  city_id:          { type: 'integer' },
                  telegram_chat_id: { type: 'integer' },
                  phone:            { type: 'string' },
                  equipment_type:   { $ref: '#/components/schemas/EquipmentType' },
                  priority:         { type: 'integer' },
                  is_active:        { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated worker',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Worker' } },
            },
          },
          400: { description: 'No fields to update or invalid value' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },

      delete: {
        tags: ['Workers'],
        summary: 'Delete a worker (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Worker deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ── Cities ───────────────────────────────────────────────────────────────
    '/api/cities': {
      get: {
        tags: ['Cities'],
        summary: 'List all cities (admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Array of cities',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/City' } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },

      post: {
        tags: ['Cities'],
        summary: 'Create a city (admin)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name:           { type: 'string',  example: 'Lviv' },
                  delivery_type:  { $ref: '#/components/schemas/DeliveryType' },
                  delivery_price: { type: 'number',  default: 0, example: 150 },
                  base_radius:    { type: 'number',  nullable: true, example: 8.0, description: 'km radius for fixed-price delivery' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'City created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/City' } },
            },
          },
          400: { description: 'name is required' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/api/cities/{id}': {
      patch: {
        tags: ['Cities'],
        summary: 'Update a city (admin)',
        description: 'Partial update — only provided fields are changed.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:           { type: 'string' },
                  delivery_type:  { $ref: '#/components/schemas/DeliveryType' },
                  delivery_price: { type: 'number' },
                  base_radius:    { type: 'number', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated city',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/City' } },
            },
          },
          400: { description: 'No fields to update' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ── Telegram ─────────────────────────────────────────────────────────────
    '/api/telegram/webhook': {
      post: {
        tags: ['Telegram'],
        summary: 'Telegram Bot webhook receiver (public)',
        description:
          'Receives `callback_query` updates from Telegram when a worker presses ' +
          '**Accept** or **Reject** on a lead message.\n\n' +
          'Always returns HTTP 200 immediately — all processing is async ' +
          '(`setImmediate`) to prevent Telegram retry storms.\n\n' +
          '**Register webhook:** `npm run telegram:setup`',
        requestBody: {
          description: 'Telegram Update object',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  update_id:      { type: 'integer' },
                  callback_query: {
                    type: 'object',
                    description: 'Set when worker presses a button',
                    properties: {
                      id:   { type: 'string' },
                      from: { type: 'object', properties: { id: { type: 'integer' } } },
                      data: {
                        type: 'string',
                        description: 'JSON string: `{"l":<leadId>,"w":<workerId>,"a":"accept"|"reject"}`',
                        example: '{"l":42,"w":3,"a":"accept"}',
                      },
                      message: {
                        type: 'object',
                        properties: { message_id: { type: 'integer' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Acknowledged — processing happens asynchronously' },
        },
      },
    },
  },

  tags: [
    { name: 'Leads',    description: 'Lead lifecycle — creation, listing, cancellation' },
    { name: 'Workers',  description: 'Worker management (CRUD)' },
    { name: 'Cities',   description: 'City management (CRUD)' },
    { name: 'Telegram', description: 'Telegram Bot webhook integration' },
    { name: 'System',   description: 'Health check and diagnostics' },
  ],
};

module.exports = spec;
