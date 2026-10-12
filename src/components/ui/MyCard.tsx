interface MyCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function MyCard({ children, className = '', id }: MyCardProps) {
  return (
    <div
      id={id}
      className={`bg-white border border-line rounded-2xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
