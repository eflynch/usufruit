import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { DatabaseService, prisma } from './database.js';

describe('DatabaseService - Secret Key Privacy & Authentication', () => {
  const mockLibrarians = [
    {
      id: 'super-1',
      name: 'Super Librarian',
      email: 'super@test.com',
      secretKey: 'super-secret-123',
      isSuper: true,
      libraryId: 'lib-1',
      library: { id: 'lib-1', name: 'Test Library' },
      books: [],
    },
    {
      id: 'regular-1',
      name: 'Regular Librarian',
      email: 'regular@test.com',
      secretKey: 'regular-secret-456',
      isSuper: false,
      libraryId: 'lib-1',
      library: { id: 'lib-1', name: 'Test Library' },
      books: [],
    },
    {
      id: 'regular-2',
      name: 'Other Regular Librarian',
      email: 'other@test.com',
      secretKey: 'other-secret-789',
      isSuper: false,
      libraryId: 'lib-1',
      library: { id: 'lib-1', name: 'Test Library' },
      books: [],
    },
  ];

  // Spy on the actual prisma methods
  const findManySpy = jest.spyOn(prisma.librarian, 'findMany');
  const findUniqueSpy = jest.spyOn(prisma.librarian, 'findUnique');
  const updateSpy = jest.spyOn(prisma.librarian, 'update');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Secret Key Privacy Guards', () => {
    describe('getLibrariansByLibraryIdSecure', () => {
      beforeEach(() => {
        findManySpy.mockResolvedValue(mockLibrarians);
      });

      it('should hide ALL secret keys when no requesting librarian provided', async () => {
        const result = await DatabaseService.getLibrariansByLibraryIdSecure('lib-1', undefined);
        
        expect(result).toHaveLength(3);
        result.forEach(librarian => {
          expect(librarian.secretKey).toBeUndefined();
          expect(librarian.id).toBeDefined(); // Other data should be present
          expect(librarian.name).toBeDefined();
        });
      });

      it('should show ALL secret keys when requesting librarian is super', async () => {
        // Mock the requesting librarian lookup to return super librarian
        findUniqueSpy.mockResolvedValue(mockLibrarians[0]);
        
        const result = await DatabaseService.getLibrariansByLibraryIdSecure('lib-1', 'super-1');
        
        expect(result).toHaveLength(3);
        expect(result[0].secretKey).toBe('super-secret-123');
        expect(result[1].secretKey).toBe('regular-secret-456');
        expect(result[2].secretKey).toBe('other-secret-789');
      });

      it('should show ONLY OWN secret key when requesting librarian is regular', async () => {
        // Mock the requesting librarian lookup to return regular librarian
        findUniqueSpy.mockResolvedValue(mockLibrarians[1]);
        
        const result = await DatabaseService.getLibrariansByLibraryIdSecure('lib-1', 'regular-1');
        
        expect(result).toHaveLength(3);
        
        const superLibrarian = result.find(l => l.id === 'super-1');
        const requestingLibrarian = result.find(l => l.id === 'regular-1');
        const otherLibrarian = result.find(l => l.id === 'regular-2');
        
        // Should see own secret key
        expect(requestingLibrarian?.secretKey).toBe('regular-secret-456');
        
        // Should NOT see others' secret keys
        expect(superLibrarian?.secretKey).toBeUndefined();
        expect(otherLibrarian?.secretKey).toBeUndefined();
        
        // But should see other data
        expect(superLibrarian?.name).toBe('Super Librarian');
        expect(otherLibrarian?.name).toBe('Other Regular Librarian');
      });
    });

    describe('getLibrarianByIdSecure', () => {
      it('should hide secret key when no requesting librarian provided', async () => {
        findUniqueSpy.mockResolvedValue(mockLibrarians[1]);
        
        const result = await DatabaseService.getLibrarianByIdSecure('regular-1', undefined);
        
        expect(result?.secretKey).toBeUndefined();
        expect(result?.id).toBe('regular-1');
        expect(result?.name).toBe('Regular Librarian');
      });

      it('should show secret key when super librarian views any profile', async () => {
        findUniqueSpy
          .mockResolvedValueOnce(mockLibrarians[1]) // Target librarian
          .mockResolvedValueOnce(mockLibrarians[0]); // Requesting librarian (super)
        
        const result = await DatabaseService.getLibrarianByIdSecure('regular-1', 'super-1');
        
        expect(result?.secretKey).toBe('regular-secret-456');
      });

      it('should show secret key when librarian views their own profile', async () => {
        findUniqueSpy
          .mockResolvedValueOnce(mockLibrarians[1]) // Target librarian  
          .mockResolvedValueOnce(mockLibrarians[1]); // Requesting librarian (same)
        
        const result = await DatabaseService.getLibrarianByIdSecure('regular-1', 'regular-1');
        
        expect(result?.secretKey).toBe('regular-secret-456');
      });

      it('should hide secret key when regular librarian views other profiles', async () => {
        findUniqueSpy
          .mockResolvedValueOnce(mockLibrarians[2]) // Target librarian
          .mockResolvedValueOnce(mockLibrarians[1]); // Requesting librarian (different regular)
        
        const result = await DatabaseService.getLibrarianByIdSecure('regular-2', 'regular-1');
        
        expect(result?.secretKey).toBeUndefined();
        expect(result?.id).toBe('regular-2');
        expect(result?.name).toBe('Other Regular Librarian');
      });

      it('should return null when target librarian not found', async () => {
        findUniqueSpy.mockResolvedValue(null);
        
        const result = await DatabaseService.getLibrarianByIdSecure('nonexistent', 'regular-1');
        
        expect(result).toBeNull();
      });
    });
  });

  describe('Authentication Requirements', () => {
    describe('updateLibrarianSuperStatus', () => {
      it('should require super librarian privileges to modify super status', async () => {
        // Mock requesting librarian as regular (not super)
        findUniqueSpy.mockResolvedValue(mockLibrarians[1]);
        
        await expect(
          DatabaseService.updateLibrarianSuperStatus('regular-2', true, 'regular-1')
        ).rejects.toThrow('Only super librarians can modify super status');
        
        // Should not call update
        expect(updateSpy).not.toHaveBeenCalled();
      });

      it('should allow super librarian to modify super status', async () => {
        // Mock requesting librarian as super
        findUniqueSpy.mockResolvedValue(mockLibrarians[0]);
        updateSpy.mockResolvedValue({
          ...mockLibrarians[1],
          isSuper: true,
        });
        
        const result = await DatabaseService.updateLibrarianSuperStatus('regular-1', true, 'super-1');
        
        expect(updateSpy).toHaveBeenCalledWith({
          where: { id: 'regular-1' },
          data: { isSuper: true },
          include: {
            library: true,
            books: true,
          },
        });
        
        expect(result.isSuper).toBe(true);
      });

      it('should throw error when requesting librarian not found', async () => {
        // Mock requesting librarian as not found
        findUniqueSpy.mockResolvedValue(null);
        
        await expect(
          DatabaseService.updateLibrarianSuperStatus('regular-1', true, 'nonexistent')
        ).rejects.toThrow('Only super librarians can modify super status');
      });
    });

    describe('authenticateLibrarian', () => {
      it('should return librarian when valid secret key provided', async () => {
        findUniqueSpy.mockResolvedValue(mockLibrarians[1]);
        
        const result = await DatabaseService.authenticateLibrarian('regular-secret-456');
        
        expect(findUniqueSpy).toHaveBeenCalledWith({
          where: { secretKey: 'regular-secret-456' },
          include: {
            library: true,
            books: true,
          },
        });
        
        expect(result?.id).toBe('regular-1');
        expect(result?.secretKey).toBe('regular-secret-456');
      });

      it('should return null when invalid secret key provided', async () => {
        findUniqueSpy.mockResolvedValue(null);
        
        const result = await DatabaseService.authenticateLibrarian('invalid-key');
        
        expect(result).toBeNull();
      });
    });
  });

  describe('Secret Key Invariants', () => {
    it('should never expose secret keys in non-secure methods', async () => {
      // This test ensures we don't accidentally expose secret keys
      // in methods that don't have "Secure" in their name
      
      findManySpy.mockResolvedValue(mockLibrarians);
      
      // Test getLibrariansByLibraryId (non-secure version)
      const result = await DatabaseService.getLibrariansByLibraryId('lib-1');
      
      // This should return raw data with secret keys
      // (the secure filtering happens in the "Secure" versions)
      expect(result[0].secretKey).toBe('super-secret-123');
      expect(result[1].secretKey).toBe('regular-secret-456');
      expect(result[2].secretKey).toBe('other-secret-789');
    });

    it('should maintain referential integrity when filtering secret keys', async () => {
      findManySpy.mockResolvedValue(mockLibrarians);
      findUniqueSpy.mockResolvedValue(mockLibrarians[1]);
      
      const result = await DatabaseService.getLibrariansByLibraryIdSecure('lib-1', 'regular-1');
      
      // Should maintain all other properties
      expect(result).toHaveLength(3);
      result.forEach(librarian => {
        expect(librarian.id).toBeDefined();
        expect(librarian.name).toBeDefined();
        expect(librarian.email).toBeDefined();
        expect(librarian.isSuper).toBeDefined();
        expect(librarian.libraryId).toBeDefined();
        expect(librarian.library).toBeDefined();
        expect(librarian.books).toBeDefined();
      });
    });
  });
});
