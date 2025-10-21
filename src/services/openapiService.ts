import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Pet, Category } from '@prisma/client';
import { PetService } from './petService';
import { CategoryService } from './categoryService';
import { AppError } from '../utils/errorHandler';

// Type for Pet with optional category relation
type PetWithCategory = Pet & {
  category?: Category | null;
};

/**
 * OpenAPI Service Handler
 *
 * This class maps OpenAPI operationIds to service methods.
 * fastify-openapi-glue will automatically route requests to methods
 * matching the operationId from the OpenAPI spec.
 */
export class OpenAPIServiceHandler {
  private petService: PetService;
  private categoryService: CategoryService;

  constructor(_prisma: PrismaClient) {
    this.petService = new PetService(_prisma);
    this.categoryService = new CategoryService(_prisma);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Format pet response with category
   */
  private formatPetResponse(pet: PetWithCategory) {
    return {
      id: pet.id,
      name: pet.name,
      status: pet.status,
      category: pet.category
        ? {
            id: pet.category.id,
            name: pet.category.name,
          }
        : undefined,
    };
  }

  // ============================================
  // PET OPERATIONS (matching operationIds)
  // ============================================

  /**
   * operationId: addPet
   * POST /pet
   */
  async addPet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = req.body as {
        name: string;
        status?: string;
        category?: { id?: number };
      };

      const pet = (await this.petService.createPet({
        name: body.name,
        status: body.status,
        categoryId: body.category?.id ?? null,
      })) as PetWithCategory;

      reply.status(200).send(this.formatPetResponse(pet));
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * operationId: updatePet
   * PUT /pet
   */
  async updatePet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = req.body as {
        id: number;
        name?: string;
        status?: string;
        category?: { id?: number };
      };

      if (!body.id) {
        reply.status(400).send({
          code: 'INVALID_INPUT',
          message: 'Pet ID is required',
        });
        return;
      }

      const pet = (await this.petService.updatePet({
        id: body.id,
        name: body.name,
        status: body.status,
        categoryId: body.category?.id ?? null,
      })) as PetWithCategory;

      reply.status(200).send(this.formatPetResponse(pet));
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * operationId: findPetsByStatus
   * GET /pet/findByStatus
   */
  async findPetsByStatus(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { status } = req.query as { status?: string };
      const pets = (await this.petService.findPetsByStatus(status)) as PetWithCategory[];

      reply.status(200).send(pets.map((pet) => this.formatPetResponse(pet)));
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * operationId: getPetById
   * GET /pet/{petId}
   */
  async getPetById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { petId } = req.params as { petId: string };
      const id = parseInt(petId, 10);

      if (isNaN(id)) {
        reply.status(400).send({
          code: 'INVALID_INPUT',
          message: 'Invalid pet ID',
        });
        return;
      }

      const pet = (await this.petService.getPetById(id)) as PetWithCategory;

      reply.status(200).send(this.formatPetResponse(pet));
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * operationId: updatePetWithForm
   * POST /pet/{petId}
   */
  async updatePetWithForm(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { petId } = req.params as { petId: string };
      const { name, status } = req.query as { name?: string; status?: string };
      const id = parseInt(petId, 10);

      if (isNaN(id)) {
        reply.status(400).send({
          code: 'INVALID_INPUT',
          message: 'Invalid pet ID',
        });
        return;
      }

      const pet = (await this.petService.updatePet({
        id,
        name,
        status,
      })) as PetWithCategory;

      reply.status(200).send(this.formatPetResponse(pet));
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * operationId: deletePet
   * DELETE /pet/{petId}
   */
  async deletePet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { petId } = req.params as { petId: string };
      const id = parseInt(petId, 10);

      if (isNaN(id)) {
        reply.status(400).send({
          code: 'INVALID_INPUT',
          message: 'Invalid pet ID',
        });
        return;
      }

      await this.petService.deletePet(id);
      reply.status(200).send({ message: 'Pet deleted' });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  // ============================================
  // CATEGORY OPERATIONS (matching operationIds)
  // ============================================

  /**
   * operationId: addCategory
   * POST /category
   */
  async addCategory(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = req.body as { name: string };

      const category = await this.categoryService.createCategory({
        name: body.name,
      });

      reply.status(200).send({
        id: category.id,
        name: category.name,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * operationId: updateCategory
   * PUT /category
   */
  async updateCategory(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = req.body as { id: number; name: string };

      if (!body.id) {
        reply.status(400).send({
          code: 'INVALID_INPUT',
          message: 'Category ID is required',
        });
        return;
      }

      const category = await this.categoryService.updateCategory(body.id, {
        name: body.name,
      });

      reply.status(200).send({
        id: category.id,
        name: category.name,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * operationId: getAllCategories
   * GET /category/listAll
   */
  async getAllCategories(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const categories = await this.categoryService.getAllCategories();

      reply.status(200).send(
        categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))
      );
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  // ============================================
  // ERROR HANDLING
  // ============================================

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
      });
    } else {
      reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }
}
