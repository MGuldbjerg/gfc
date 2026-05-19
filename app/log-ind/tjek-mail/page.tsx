export default function TjekMailPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-2xl font-bold text-white mb-3">Tjek din e-mail</h1>
        <p className="text-gray-400 leading-relaxed">
          Vi har sendt dig et link. Klik på det for at logge ind.
          Linket virker i 24 timer.
        </p>
        <p className="text-gray-600 text-sm mt-4">
          Kan du ikke finde mailen? Tjek spam-mappen.
        </p>
      </div>
    </main>
  )
}
