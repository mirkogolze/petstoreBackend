import { PrismaClient, Pet, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errorHandler';

/**
 * Pet service - handles business logic for pet operations
 */
export class PetService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new pet
   */
  async createPet(data: {
    name: string;
    status?: string;
    categoryId?: number | null;
  }): Promise<Pet> {
    // Validate category exists if provided
    if (data.categoryId !== null && data.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new ValidationError('Category not found', { categoryId: data.categoryId });
      }
    }

    // Validate status
    const validStatuses = ['available', 'pending', 'sold'];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new ValidationError('Invalid status value', {
        status: data.status,
        validStatuses,
      });
    }

    try {
      const pet = await this.prisma.pet.create({
        data: {
          name: data.name,
          status: data.status || 'available',
          categoryId: data.categoryId,
        },
        include: {
          category: true,
        },
      });

      return pet;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ValidationError('Failed to create pet', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Update an existing pet
   */
  async updatePet(data: {
    id: number;
    name?: string;
    status?: string;
    categoryId?: number | null;
  }): Promise<Pet> {
    // Check if pet exists
    const existingPet = await this.prisma.pet.findUnique({
      where: { id: data.id },
    });

    if (!existingPet) {
      throw new NotFoundError('Pet not found', { id: data.id });
    }

    // Validate category exists if provided
    if (data.categoryId !== null && data.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new ValidationError('Category not found', { categoryId: data.categoryId });
      }
    }

    // Validate status
    const validStatuses = ['available', 'pending', 'sold'];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new ValidationError('Invalid status value', {
        status: data.status,
        validStatuses,
      });
    }

    try {
      const pet = await this.prisma.pet.update({
        where: { id: data.id },
        data: {
          name: data.name,
          status: data.status,
          categoryId: data.categoryId,
        },
        include: {
          category: true,
        },
      });

      return pet;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Pet not found', { id: data.id });
        }
        throw new ValidationError('Failed to update pet', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Find pets by status
   */
  async findPetsByStatus(status: string = 'available'): Promise<Pet[]> {
    // Validate status
    const validStatuses = ['available', 'pending', 'sold'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError('Invalid status value', {
        status,
        validStatuses,
      });
    }

    const pets = await this.prisma.pet.findMany({
      where: { status },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return pets;
  }

  /**
   * Get pet by ID
   */
  async getPetById(id: number): Promise<Pet> {
    if (id < 1 || !Number.isInteger(id)) {
      throw new BadRequestError('Invalid pet ID', { id });
    }

    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!pet) {
      throw new NotFoundError('Pet not found', { id });
    }

    return pet;
  }

  /**
   * Delete pet by ID
   */
  async deletePet(id: number): Promise<void> {
    if (id < 1 || !Number.isInteger(id)) {
      throw new BadRequestError('Invalid pet ID', { id });
    }

    // Check if pet exists
    const pet = await this.prisma.pet.findUnique({
      where: { id },
    });

    if (!pet) {
      throw new NotFoundError('Pet not found', { id });
    }

    try {
      await this.prisma.pet.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Pet not found', { id });
        }
        throw new ValidationError('Failed to delete pet', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Get all pets
   */
  async getAllPets(): Promise<Pet[]> {
    const pets = await this.prisma.pet.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return pets;
  }
}
