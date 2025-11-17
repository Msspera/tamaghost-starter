
import './globals.css';

export const metadata = {
  title: 'Tamaghost',
  description: 'Um bichinho virtual social e distribuído.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
