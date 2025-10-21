import { PetService } from '../src/services/petService';
import { PrismaClient } from '@prisma/client';
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
  });
});
