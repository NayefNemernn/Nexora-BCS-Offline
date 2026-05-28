export default function AppLayout({ sidebar, children }) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {sidebar}
      <main className="flex-1 overflow-y-auto text-gray-900 dark:text-gray-100 transition-colors">
        {children}
      </main>
    </div>
  );
}
