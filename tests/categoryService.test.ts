import { CategoryService } from '../src/services/categoryService';
import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError, BadRequestError } from '../src/utils/errorHandler';

// Mock Prisma Client
const mockPrismaClient = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

describe('CategoryService', () => {
  let categoryService: CategoryService;

  beforeEach(() => {
    categoryService = new CategoryService(mockPrismaClient);
    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Dogs' },
        { id: 2, name: 'Cats' },
      ];

      (mockPrismaClient.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await categoryService.getAllCategories();

      expect(result).toEqual(mockCategories);
      expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getCategoryById', () => {
    it('should return a category by ID', async () => {
      const mockCategory = { id: 1, name: 'Dogs' };

      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      const result = await categoryService.getCategoryById(1);

      expect(result).toEqual(mockCategory);
      expect(mockPrismaClient.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError if category does not exist', async () => {
      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(categoryService.getCategoryById(1)).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError for invalid ID', async () => {
      await expect(categoryService.getCategoryById(-1)).rejects.toThrow(BadRequestError);
      await expect(categoryService.getCategoryById(0)).rejects.toThrow(BadRequestError);
    });
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const mockCategory = { id: 1, name: 'Dogs' };

      (mockPrismaClient.category.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrismaClient.category.create as jest.Mock).mockResolvedValue(mockCategory);

      const result = await categoryService.createCategory({ name: 'Dogs' });

      expect(result).toEqual(mockCategory);
      expect(mockPrismaClient.category.create).toHaveBeenCalledWith({
        data: { name: 'Dogs' },
      });
    });

    it('should throw ValidationError if name is empty', async () => {
      await expect(categoryService.createCategory({ name: '' })).rejects.toThrow(ValidationError);
      await expect(categoryService.createCategory({ name: '   ' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError if category name already exists', async () => {
      const existingCategory = { id: 1, name: 'Dogs' };

      (mockPrismaClient.category.findFirst as jest.Mock).mockResolvedValue(existingCategory);

      await expect(categoryService.createCategory({ name: 'Dogs' })).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('updateCategory', () => {
    it('should update a category successfully', async () => {
      const mockCategory = { id: 1, name: 'Updated Dogs' };

      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Dogs',
      });
      (mockPrismaClient.category.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrismaClient.category.update as jest.Mock).mockResolvedValue(mockCategory);

      const result = await categoryService.updateCategory(1, { name: 'Updated Dogs' });

      expect(result).toEqual(mockCategory);
      expect(mockPrismaClient.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Dogs' },
      });
    });

    it('should throw NotFoundError if category does not exist', async () => {
      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(categoryService.updateCategory(1, { name: 'Updated' })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      const mockCategory = { id: 1, name: 'Dogs', pets: [] };

      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrismaClient.category.delete as jest.Mock).mockResolvedValue(mockCategory);

      await categoryService.deleteCategory(1);

      expect(mockPrismaClient.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw ValidationError if category has associated pets', async () => {
      const mockCategory = {
        id: 1,
        name: 'Dogs',
        pets: [{ id: 1, name: 'Buddy' }],
      };

      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      await expect(categoryService.deleteCategory(1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if category does not exist', async () => {
      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(categoryService.deleteCategory(1)).rejects.toThrow(NotFoundError);
    });
  });
});
