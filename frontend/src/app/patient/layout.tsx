import RouteGuard from "@/components/RouteGuard";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard role="patient">
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </RouteGuard>
  );
}
