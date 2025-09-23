import styles from './page.module.css';
import { Librarian } from '@usufruit/models';
import Link from 'next/link';

export default function Home() {
  // Test that our types are working
  const testLibrarian: Librarian = {
    id: '1',
    name: 'Test Librarian',
    contactInfo: 'test@example.com',
    libraryId: 'lib-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <div className={styles.page}>
      <div className="wrapper">
        <div className="container">
          <div id="welcome">
            <h1>
              <span>📚 Welcome to </span>
              Usufruit
            </h1>
            <p className={styles.subtitle}>
              A distributed library management tool for communities
            </p>
          </div>

          <div id="hero" className="rounded">
            <div className="text-container">
              <h2>Share, Borrow, and Manage Community Resources</h2>
              <p>
                Usufruit enables communities to create decentralized libraries where 
                anyone can be a librarian, managing and sharing books, tools, and 
                other resources with their neighbors.
              </p>
              
              <div className={styles.features}>
                <div className={styles.feature}>
                  <h3>📖 Manage Items</h3>
                  <p>Add books, tools, or any borrowable items with custom organizing rules</p>
                </div>
                <div className={styles.feature}>
                  <h3>👥 Community Librarians</h3>
                  <p>Everyone can be a librarian, responsible for their own items</p>
                </div>
                <div className={styles.feature}>
                  <h3>🔄 Easy Loans</h3>
                  <p>Simple check-in and check-out process with clear instructions</p>
                </div>
              </div>
              
              <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
                <p>Models library connected: {testLibrarian.name} ✅</p>
                <Link href="/libraries" style={{ color: '#007bff', textDecoration: 'underline' }}>
                  → Test Database Connection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
