export function EmptyPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground" style={{ fontSize: "14px" }}>
      {title}
    </div>
  );
}
