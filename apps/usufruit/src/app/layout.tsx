import './global.css';

export const metadata = {
  title: 'usufruit - distributed library management',
  description: 'community-driven library management tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer style={{ 
          borderTop: '1px solid #ccc', 
          marginTop: '40px',
          paddingTop: '20px',
          paddingBottom: '20px',
          paddingLeft: '20px',
          paddingRight: '20px',
          fontSize: '12px', 
          color: '#999',
          fontFamily: 'monospace'
        }}>
          <p style={{ margin: '0 0 5px 0' }}>
            questions? bugs? check out the <a href="https://github.com/eflynch/usufruit" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>github</a>
          </p>
          <p style={{ margin: '0 0 5px 0' }}>
            if you think this site is cool, consider supporting its maintenance and development: <a href="https://www.paypal.com/paypalme/boardzorg" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>donate</a>
          </p>
          <p style={{ margin: '0' }}>
            © 2025 Evan Lynch • open source under <a href="https://github.com/eflynch/usufruit/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>MIT license</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
