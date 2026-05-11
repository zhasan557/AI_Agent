import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ML Training Playground — NEXUS AI Agent',
  description: 'Train machine learning models directly in your browser. Upload CSV data, configure model architecture, and train with real-time visualization.',
};

export default function TrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
