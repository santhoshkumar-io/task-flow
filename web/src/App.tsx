// V0 only. This exists to prove the page renders and that a Tailwind class
// is actually applied. The real screens start in V6.
function App() {
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="rounded-lg border border-neutral-200 px-6 py-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
        <p className="mt-1 text-sm text-neutral-500">Frontend is running.</p>
      </div>
    </main>
  )
}

export default App
