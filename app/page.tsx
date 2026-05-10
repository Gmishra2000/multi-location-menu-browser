export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Multi-Location Menu Browser
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Powered by Square&apos;s Catalog API
        </p>

        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
          <p className="text-gray-700 mb-4">🚧 Under Construction</p>
          <p className="text-sm text-gray-500">
            API Routes are ready. UI components coming next.
          </p>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Test the API:</p>
          <ul className="mt-2 space-y-1">
            <li>
              <a
                href="/api/locations"
                className="text-blue-600 hover:underline"
                target="_blank"
              >
                /api/locations
              </a>
            </li>
            <li>
              <a
                href="/api/catalog"
                className="text-blue-600 hover:underline"
                target="_blank"
              >
                /api/catalog
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

// TODO: Phase 3 - Build actual menu browser UI
// - Location switcher component
// - Menu grid with items
// - Category filtering
// - Item detail modal
