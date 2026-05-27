import RouteGuard from "@/components/RouteGuard";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard role="doctor">
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </RouteGuard>
  );
}
