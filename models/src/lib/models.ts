export function models(): string {
  return 'models';
}

// Core types for Usufruit distributed library management
// These types match our Prisma schema

export type Librarian = {
  id: string;
  name: string;
  contactInfo: string;
  libraryId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Book = {
  id: string;
  title: string;
  author?: string;
  description?: string;
  organizingRules?: string;
  checkInInstructions?: string;
  checkOutInstructions?: string;
  libraryId: string;
  librarianId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Loan = {
  id: string;
  bookId: string;
  librarianId: string;
  borrowedAt: Date;
  dueDate?: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Library = {
  id: string;
  name: string;
  description?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
};
