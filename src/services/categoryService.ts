import { PrismaClient, Category, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errorHandler';

/**
 * Category service - handles business logic for category operations
 */
export class CategoryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return categories;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category> {
    if (id < 1 || !Number.isInteger(id)) {
      throw new BadRequestError('Invalid category ID', { id });
    }

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundError('Category not found', { id });
    }

    return category;
  }

  /**
   * Create a new category
   */
  async createCategory(data: { name: string }): Promise<Category> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Category name is required', { name: data.name });
    }

    // Check if category with same name already exists
    const existing = await this.prisma.category.findFirst({
      where: {
        name: data.name,
      },
    });

    if (existing) {
      throw new ValidationError('Category with this name already exists', {
        name: data.name,
      });
    }

    try {
      const category = await this.prisma.category.create({
        data: {
          name: data.name.trim(),
        },
      });

      return category;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ValidationError('Category with this name already exists', {
            name: data.name,
          });
        }
        throw new ValidationError('Failed to create category', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(id: number, data: { name: string }): Promise<Category> {
    if (id < 1 || !Number.isInteger(id)) {
      throw new BadRequestError('Invalid category ID', { id });
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Category name is required', { name: data.name });
    }

    // Check if category exists
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Category not found', { id });
    }

    // Check if another category with same name exists
    const duplicate = await this.prisma.category.findFirst({
      where: {
        name: data.name,
        id: {
          not: id,
        },
      },
    });

    if (duplicate) {
      throw new ValidationError('Category with this name already exists', {
        name: data.name,
      });
    }

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          name: data.name.trim(),
        },
      });

      return category;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Category not found', { id });
        }
        if (error.code === 'P2002') {
          throw new ValidationError('Category with this name already exists', {
            name: data.name,
          });
        }
        throw new ValidationError('Failed to update category', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<void> {
    if (id < 1 || !Number.isInteger(id)) {
      throw new BadRequestError('Invalid category ID', { id });
    }

    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        pets: true,
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found', { id });
    }

    // Check if category has pets
    if (category.pets && category.pets.length > 0) {
      throw new ValidationError(
        'Cannot delete category with associated pets. Please remove or reassign pets first.',
        {
          id,
          petCount: category.pets.length,
        }
      );
    }

    try {
      await this.prisma.category.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Category not found', { id });
        }
        throw new ValidationError('Failed to delete category', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Get category with pets
   */
  async getCategoryWithPets(id: number) {
    if (id < 1 || !Number.isInteger(id)) {
      throw new BadRequestError('Invalid category ID', { id });
    }

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        pets: true,
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found', { id });
    }

    return category;
  }
}
