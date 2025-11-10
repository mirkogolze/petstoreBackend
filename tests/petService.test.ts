import { PetService } from '../src/services/petService';
import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, BadRequestError } from '../src/utils/errorHandler';

// Mock Prisma Client
const mockPrismaClient = {
  pet: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

describe('PetService', () => {
  let petService: PetService;

  beforeEach(() => {
    petService = new PetService(mockPrismaClient);
    jest.clearAllMocks();
  });

  describe('createPet', () => {
    it('should create a pet successfully', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.create as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.createPet({
        name: 'Buddy',
        status: 'available',
      });

      expect(result).toEqual(mockPet);
      expect(mockPrismaClient.pet.create).toHaveBeenCalledWith({
        data: {
          name: 'Buddy',
          status: 'available',
          categoryId: undefined,
        },
        include: {
          category: true,
        },
      });
    });

    it('should throw ValidationError for invalid status', async () => {
      await expect(
        petService.createPet({
          name: 'Buddy',
          status: 'invalid-status',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if category does not exist', async () => {
      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        petService.createPet({
          name: 'Buddy',
          categoryId: 999,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getPetById', () => {
    it('should return a pet by ID', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.getPetById(1);

      expect(result).toEqual(mockPet);
      expect(mockPrismaClient.pet.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { category: true },
      });
    });

    it('should throw NotFoundError if pet does not exist', async () => {
      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(petService.getPetById(1)).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError for invalid ID', async () => {
      await expect(petService.getPetById(-1)).rejects.toThrow(BadRequestError);
      await expect(petService.getPetById(0)).rejects.toThrow(BadRequestError);
    });
  });

  describe('findPetsByStatus', () => {
    it('should return pets by status', async () => {
      const mockPets = [
        {
          id: 1,
          name: 'Buddy',
          status: 'available',
          categoryId: null,
          category: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaClient.pet.findMany as jest.Mock).mockResolvedValue(mockPets);

      const result = await petService.findPetsByStatus('available');

      expect(result).toEqual(mockPets);
      expect(mockPrismaClient.pet.findMany).toHaveBeenCalledWith({
        where: { status: 'available' },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw BadRequestError for invalid status', async () => {
      await expect(petService.findPetsByStatus('invalid')).rejects.toThrow(BadRequestError);
    });
  });

  describe('deletePet', () => {
    it('should delete a pet successfully', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);
      (mockPrismaClient.pet.delete as jest.Mock).mockResolvedValue(mockPet);

      await petService.deletePet(1);

      expect(mockPrismaClient.pet.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError if pet does not exist', async () => {
      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(petService.deletePet(1)).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError for invalid pet ID (negative)', async () => {
      await expect(petService.deletePet(-1)).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid pet ID (zero)', async () => {
      await expect(petService.deletePet(0)).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid pet ID (non-integer)', async () => {
      await expect(petService.deletePet(1.5)).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError when Prisma returns P2025 error', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);
      
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      
      (mockPrismaClient.pet.delete as jest.Mock).mockRejectedValue(prismaError);

      await expect(petService.deletePet(1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updatePet', () => {
    it('should update a pet successfully with all fields', async () => {
      const existingPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPet = {
        ...existingPet,
        name: 'Max',
        status: 'sold',
        categoryId: 1,
        category: { id: 1, name: 'Dogs' },
      };

      const mockCategory = { id: 1, name: 'Dogs', createdAt: new Date(), updatedAt: new Date() };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(existingPet);
      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrismaClient.pet.update as jest.Mock).mockResolvedValue(updatedPet);

      const result = await petService.updatePet({
        id: 1,
        name: 'Max',
        status: 'sold',
        categoryId: 1,
      });

      expect(result).toEqual(updatedPet);
      expect(mockPrismaClient.pet.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Max',
          status: 'sold',
          categoryId: 1,
        },
        include: {
          category: true,
        },
      });
    });

    it('should update a pet with only name', async () => {
      const existingPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPet = { ...existingPet, name: 'Max' };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(existingPet);
      (mockPrismaClient.pet.update as jest.Mock).mockResolvedValue(updatedPet);

      const result = await petService.updatePet({
        id: 1,
        name: 'Max',
      });

      expect(result.name).toBe('Max');
    });

    it('should update a pet with only status', async () => {
      const existingPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPet = { ...existingPet, status: 'pending' };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(existingPet);
      (mockPrismaClient.pet.update as jest.Mock).mockResolvedValue(updatedPet);

      const result = await petService.updatePet({
        id: 1,
        status: 'pending',
      });

      expect(result.status).toBe('pending');
    });

    it('should throw NotFoundError if pet does not exist', async () => {
      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        petService.updatePet({
          id: 999,
          name: 'Max',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid status', async () => {
      const existingPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(existingPet);

      await expect(
        petService.updatePet({
          id: 1,
          status: 'invalid-status',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if category does not exist', async () => {
      const existingPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(existingPet);
      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        petService.updatePet({
          id: 1,
          categoryId: 999,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when Prisma returns P2025 error', async () => {
      const existingPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(existingPet);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      (mockPrismaClient.pet.update as jest.Mock).mockRejectedValue(prismaError);

      await expect(
        petService.updatePet({
          id: 1,
          name: 'Max',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle setting categoryId to null', async () => {
      const existingPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: 1,
        category: { id: 1, name: 'Dogs' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPet = { ...existingPet, categoryId: null, category: null };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(existingPet);
      (mockPrismaClient.pet.update as jest.Mock).mockResolvedValue(updatedPet);

      const result = await petService.updatePet({
        id: 1,
        categoryId: null,
      });

      expect(result.categoryId).toBeNull();
    });
  });

  describe('getAllPets', () => {
    it('should return all pets', async () => {
      const mockPets = [
        {
          id: 1,
          name: 'Buddy',
          status: 'available',
          categoryId: 1,
          category: { id: 1, name: 'Dogs' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Whiskers',
          status: 'sold',
          categoryId: 2,
          category: { id: 2, name: 'Cats' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaClient.pet.findMany as jest.Mock).mockResolvedValue(mockPets);

      const result = await petService.getAllPets();

      expect(result).toEqual(mockPets);
      expect(result).toHaveLength(2);
      expect(mockPrismaClient.pet.findMany).toHaveBeenCalledWith({
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when no pets exist', async () => {
      (mockPrismaClient.pet.findMany as jest.Mock).mockResolvedValue([]);

      const result = await petService.getAllPets();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('createPet - additional scenarios', () => {
    it('should create a pet with a valid category', async () => {
      const mockCategory = { id: 1, name: 'Dogs', createdAt: new Date(), updatedAt: new Date() };
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: 1,
        category: mockCategory,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrismaClient.pet.create as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.createPet({
        name: 'Buddy',
        status: 'available',
        categoryId: 1,
      });

      expect(result).toEqual(mockPet);
      expect(result.categoryId).toBe(1);
    });

    it('should create a pet with pending status', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'pending',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.create as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.createPet({
        name: 'Buddy',
        status: 'pending',
      });

      expect(result.status).toBe('pending');
    });

    it('should create a pet with sold status', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'sold',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.create as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.createPet({
        name: 'Buddy',
        status: 'sold',
      });

      expect(result.status).toBe('sold');
    });

    it('should handle Prisma errors during creation', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      (mockPrismaClient.pet.create as jest.Mock).mockRejectedValue(prismaError);

      await expect(
        petService.createPet({
          name: 'Buddy',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should create pet with null categoryId explicitly', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.create as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.createPet({
        name: 'Buddy',
        categoryId: null,
      });

      expect(result.categoryId).toBeNull();
    });
  });

  describe('findPetsByStatus - additional scenarios', () => {
    it('should return pets with pending status', async () => {
      const mockPets = [
        {
          id: 1,
          name: 'Buddy',
          status: 'pending',
          categoryId: null,
          category: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaClient.pet.findMany as jest.Mock).mockResolvedValue(mockPets);

      const result = await petService.findPetsByStatus('pending');

      expect(result).toEqual(mockPets);
      expect(mockPrismaClient.pet.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return pets with sold status', async () => {
      const mockPets = [
        {
          id: 1,
          name: 'Buddy',
          status: 'sold',
          categoryId: null,
          category: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaClient.pet.findMany as jest.Mock).mockResolvedValue(mockPets);

      const result = await petService.findPetsByStatus('sold');

      expect(result).toEqual(mockPets);
    });

    it('should return empty array when no pets match status', async () => {
      (mockPrismaClient.pet.findMany as jest.Mock).mockResolvedValue([]);

      const result = await petService.findPetsByStatus('available');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should use default status (available) when not provided', async () => {
      const mockPets = [
        {
          id: 1,
          name: 'Buddy',
          status: 'available',
          categoryId: null,
          category: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaClient.pet.findMany as jest.Mock).mockResolvedValue(mockPets);

      const result = await petService.findPetsByStatus();

      expect(result).toEqual(mockPets);
      expect(mockPrismaClient.pet.findMany).toHaveBeenCalledWith({
        where: { status: 'available' },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getPetById - additional scenarios', () => {
    it('should return pet with category', async () => {
      const mockPet = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        categoryId: 1,
        category: { id: 1, name: 'Dogs', createdAt: new Date(), updatedAt: new Date() },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.getPetById(1);

      expect(result).toEqual(mockPet);
    });

    it('should throw BadRequestError for non-integer ID (float)', async () => {
      await expect(petService.getPetById(1.5)).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for non-integer ID (NaN)', async () => {
      await expect(petService.getPetById(NaN)).rejects.toThrow(BadRequestError);
    });

    it('should work with large pet IDs', async () => {
      const mockPet = {
        id: 999999,
        name: 'Buddy',
        status: 'available',
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);

      const result = await petService.getPetById(999999);

      expect(result).toEqual(mockPet);
      expect(result.id).toBe(999999);
    });
  });
});
