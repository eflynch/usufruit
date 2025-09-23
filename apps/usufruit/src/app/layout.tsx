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
      <body>{children}</body>
    </html>
  );
}
