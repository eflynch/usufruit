export function models(): string {
  return 'models';
}

// Core abstractions for Usufruit distributed library management

export type Librarian = {
  id: string;
  name: string;
  contactInfo?: string;
};

export type Book = {
  id: string;
  title: string;
  description?: string;
  organizingRules?: string;
  checkInInstructions?: string;
  checkOutInstructions?: string;
  librarian: Librarian;
};

export type Loan = {
  id: string;
  book: Book;
  borrower: Librarian;
  startDate: string;
  dueDate?: string;
  returnedDate?: string;
};

export type Library = {
  id: string;
  name: string;
  books: Book[];
};
