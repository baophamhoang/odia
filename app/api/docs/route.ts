import { ApiReference } from "@scalar/nextjs-api-reference";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Odia API",
    version: "1.0.0",
    description:
      "External API for accessing Odia photo data. All endpoints require the `X-ODIA-API-KEY` header.",
  },
  servers: [{ url: process.env.NEXTAUTH_URL ?? "http://localhost:3000" }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-ODIA-API-KEY",
      },
    },
    schemas: {
      Photo: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
          fileName: { type: "string", nullable: true, example: "run-photo-001.jpg" },
          mimeType: { type: "string", nullable: true, example: "image/jpeg" },
          fileSize: { type: "integer", nullable: true, example: 2048576 },
          createdAt: { type: "string", nullable: true, example: "2024-11-01 08:32:00" },
          runId: { type: "string", nullable: true, example: "run_abc123" },
          folderId: { type: "string", nullable: true, example: "folder_xyz789" },
          uploadedBy: { type: "string", example: "user_def456" },
          url: {
            type: "string",
            description: "Signed download URL (valid for 1 hour)",
            example: "https://cdn.example.com/photos/abc.jpg?X-Amz-Signature=...",
          },
          thumbUrl: {
            type: "string",
            nullable: true,
            description: "Signed thumbnail URL (valid for 1 hour)",
            example: "https://cdn.example.com/thumbs/abc.jpg?X-Amz-Signature=...",
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 450 },
          totalPages: { type: "integer", example: 23 },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
        },
      },
    },
  },
  paths: {
    "/api/photos": {
      get: {
        summary: "List photos",
        description:
          "Returns a paginated list of all photos ordered by most recent first. Each photo includes a signed URL valid for 1 hour.",
        operationId: "listPhotos",
        tags: ["Photos"],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number (1-based)",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Number of photos per page (max 100)",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of photos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Photo" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid API key",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
};

export const GET = ApiReference({ content: spec });
